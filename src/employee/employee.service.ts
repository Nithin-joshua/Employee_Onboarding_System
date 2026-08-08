import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditLogService } from '../db/audit-log.service';
import { Employee, EmployeeStatus } from '../interfaces/types.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ComplianceRuleService } from './compliance-rule.service';

export function mapEmployee(emp: any): Employee {
  return {
    id: emp.id,
    status: emp.status as EmployeeStatus,
    personal: emp.personal as any,
    job: emp.job as any,
    documentIds: emp.documents ? emp.documents.map((d: any) => d.id) : [],
    complianceFormIds: emp.complianceForms ? emp.complianceForms.map((c: any) => c.id) : [],
    milestoneIds: emp.milestones ? emp.milestones.map((m: any) => m.id) : [],
    createdAt: emp.createdAt instanceof Date ? emp.createdAt.toISOString() : emp.createdAt,
    updatedAt: emp.updatedAt instanceof Date ? emp.updatedAt.toISOString() : emp.updatedAt,
  };
}

@Injectable()
export class EmployeeService {
  constructor(
    private readonly db: DbService,
    private readonly complianceRuleService: ComplianceRuleService,
    private readonly auditLogService: AuditLogService,
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

    const { requiredForms } = await this.complianceRuleService.evaluateEligibility(
      employee.job.salary,
    );

    for (const formType of requiredForms) {
      try {
        await this.db.complianceForm.create({
          data: {
            id: Math.random().toString(36).substring(7),
            employeeId,
            type: formType,
            status: 'PENDING_GENERATION',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            data: {},
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
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
    const newEmployee = await this.db.employee.create({
      data: {
        id: Math.random().toString(36).substring(7),
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

  async openPreboardingLink(employeeId: string, role: string): Promise<Employee> {
    const employee = await this.db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    if (employee.status !== 'INVITED') {
      throw new ConflictException(`Cannot open preboarding link. Employee status is ${employee.status}`);
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

  validateRole(role: string, allowed: string[], employeeId?: string, signedBy?: string) {
    if (allowed.includes('SYSTEM') && role === 'SYSTEM') {
      return;
    }
    if (allowed.includes('NEW_HIRE') && role === 'NEW_HIRE') {
      if (employeeId && signedBy && signedBy !== employeeId) {
        throw new ForbiddenException(`New hire can only perform actions for themselves`);
      }
      return;
    }
    if (allowed.includes('HR') && role === 'HR') {
      return;
    }
    if (allowed.includes('MANAGER') && role === 'MANAGER') {
      return;
    }
    throw new ForbiddenException(`Role ${role} is not authorized for this action`);
  }
}
