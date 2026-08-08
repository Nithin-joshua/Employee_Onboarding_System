import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditLogService } from '../db/audit-log.service';
import {
  Employee,
  EmployeeStatus,
  assertPersonalDetails,
  assertJobDetails,
} from '../interfaces/types.interface';
import {
  Employee as PrismaEmployee,
  Document as PrismaDocument,
  ComplianceForm as PrismaComplianceForm,
  Milestone as PrismaMilestone,
} from '@prisma/client';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ComplianceRuleService } from './compliance-rule.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface PrismaEmployeeWithRelations extends PrismaEmployee {
  documents?: PrismaDocument[];
  complianceForms?: PrismaComplianceForm[];
  milestones?: PrismaMilestone[];
}

export function mapEmployee(emp: PrismaEmployeeWithRelations): Employee {
  return {
    id: emp.id,
    status: emp.status as EmployeeStatus,
    personal: assertPersonalDetails(emp.personal ?? {}),
    job: assertJobDetails(emp.job ?? {}),
    documentIds: emp.documents ? emp.documents.map((d) => d.id) : [],
    complianceFormIds: emp.complianceForms
      ? emp.complianceForms.map((c) => c.id)
      : [],
    milestoneIds: emp.milestones ? emp.milestones.map((m) => m.id) : [],
    createdAt:
      emp.createdAt instanceof Date
        ? emp.createdAt.toISOString()
        : emp.createdAt,
    updatedAt:
      emp.updatedAt instanceof Date
        ? emp.updatedAt.toISOString()
        : emp.updatedAt,
  };
}

@Injectable()
export class EmployeeService {
  constructor(
    private readonly db: DbService,
    private readonly complianceRuleService: ComplianceRuleService,
    private readonly auditLogService: AuditLogService,
    private readonly emailService: EmailService,
  ) {}

  async generateComplianceForms(employeeId: string): Promise<void> {
    const employee = await this.getEmployeeOrThrow(employeeId);

    // If forms already exist, do not regenerate them to avoid race conditions.
    const formsCount = await this.db.complianceForm.count({
      where: { employeeId },
    });
    if (formsCount > 0) {
      return;
    }

    const { requiredForms } =
      await this.complianceRuleService.evaluateEligibility(
        employee.job.salary ?? 0,
      );

    for (const formType of requiredForms) {
      try {
        await this.db.complianceForm.create({
          data: {
            id: crypto.randomUUID(),
            employeeId,
            type: formType,
            status: 'PENDING_GENERATION',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            data: {},
          },
        });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          err.code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }
  }

  async listEmployees(): Promise<Employee[]> {
    const list = await this.db.employee.findMany({
      include: {
        documents: true,
        complianceForms: true,
        milestones: true,
      },
    });
    return list.map(mapEmployee);
  }

  private async getEmployeeOrThrow(id: string): Promise<Employee> {
    const employee = await this.db.employee.findUnique({
      where: { id },
      include: {
        documents: true,
        complianceForms: true,
        milestones: true,
      },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return mapEmployee(employee);
  }

  async createEmployee(dto: CreateEmployeeDto): Promise<Employee> {
    const employeeId = crypto.randomUUID();
    const newEmployee = await this.db.employee.create({
      data: {
        id: employeeId,
        status: 'INVITED',
        personal: {
          name: dto.name,
          dob: dto.dob,
          phone: dto.phone,
          email: dto.email,
        },
        job: {
          title: dto.title,
          department: dto.department,
          managerId: dto.managerId,
          salary: dto.salary,
          joiningDate: dto.joiningDate,
        },
      },
      include: {
        documents: true,
        complianceForms: true,
        milestones: true,
      },
    });

    // Option B: Create User account with NEW_HIRE role and a securely generated temp password
    const tempPassword = crypto.randomBytes(6).toString('hex') + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.db.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: 'NEW_HIRE',
        employeeId: newEmployee.id,
      },
    });

    // Email credentials
    await this.emailService.sendOnboardingInvite(
      dto.email,
      dto.name,
      tempPassword,
    );

    await this.auditLogService.createLog({
      employeeId: newEmployee.id,
      fromStatus: 'INVITED',
      toStatus: 'INVITED',
      actorId: dto.managerId || 'HR_PORTAL',
      actorRole: 'HR',
      note: `Employee invited by HR. Title: ${dto.title}, Dept: ${dto.department}`,
    });

    return mapEmployee(newEmployee);
  }

  async getEmployee(id: string): Promise<Employee> {
    return this.getEmployeeOrThrow(id);
  }

  async openPreboardingLink(
    employeeId: string,
    role: string,
  ): Promise<Employee> {
    void role;
    const employee = await this.db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    if (employee.status !== 'INVITED') {
      throw new ConflictException(
        `Cannot open preboarding link. Employee status is ${employee.status}`,
      );
    }

    const updated = await this.db.employee.update({
      where: { id: employeeId },
      data: {
        status: 'DOCUMENTS_PENDING',
      },
      include: {
        documents: true,
        complianceForms: true,
        milestones: true,
      },
    });

    await this.auditLogService.createLog({
      employeeId,
      fromStatus: employee.status,
      toStatus: 'DOCUMENTS_PENDING',
      actorId: employeeId,
      actorRole: 'NEW_HIRE',
      note: 'Preboarding link opened, status updated to documents pending',
    });

    return mapEmployee(updated);
  }

  validateRole(
    role: string,
    allowed: string[],
    employeeId?: string,
    signedBy?: string,
  ) {
    if (allowed.includes('SYSTEM') && role === 'SYSTEM') {
      return;
    }
    if (allowed.includes('NEW_HIRE') && role === 'NEW_HIRE') {
      if (employeeId && signedBy && signedBy !== employeeId) {
        throw new ForbiddenException(
          `New hire can only perform actions for themselves`,
        );
      }
      return;
    }
    if (allowed.includes('HR') && role === 'HR') {
      return;
    }
    if (allowed.includes('MANAGER') && role === 'MANAGER') {
      return;
    }
    throw new ForbiddenException(
      `Role ${role} is not authorized for this action`,
    );
  }
}
