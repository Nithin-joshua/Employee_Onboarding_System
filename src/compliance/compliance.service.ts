import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditLogService } from '../db/audit-log.service';
import { Employee, ComplianceForm } from '../interfaces/types.interface';
import { MilestoneService } from '../milestone/milestone.service';
import { mapEmployee, EmployeeService } from '../employee/employee.service';
import { ComplianceRuleService } from '../employee/compliance-rule.service';
import * as crypto from 'crypto';
import { ComplianceForm as PrismaComplianceForm } from '@prisma/client';

export function computeComplianceLogic(employee: Employee): {
  pfApplicable: boolean;
  esiApplicable: boolean;
} {
  const pfApplicable = true; // assume org >=20 employees
  const esiApplicable = (employee.job.salary ?? 0) <= 21000;
  return { pfApplicable, esiApplicable };
}

export function mapComplianceForm(cf: PrismaComplianceForm): ComplianceForm {
  return {
    id: cf.id,
    employeeId: cf.employeeId,
    type: cf.type,
    status: cf.status,
    deadline:
      cf.deadline instanceof Date ? cf.deadline.toISOString() : cf.deadline,
    data: cf.data as Record<string, unknown>,
  };
}

@Injectable()
export class ComplianceService {
  constructor(
    private readonly db: DbService,
    private readonly milestoneService: MilestoneService,
    private readonly employeeService: EmployeeService,
    private readonly auditLogService: AuditLogService,
    private readonly complianceRuleService: ComplianceRuleService,
  ) {}

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

  private validateRole(role: string, allowed: string[]) {
    if (allowed.includes('SYSTEM') && role === 'SYSTEM') {
      return;
    }
    if (allowed.includes('HR') && role === 'HR') {
      return;
    }
    if (allowed.includes('NEW_HIRE') && role === 'NEW_HIRE') {
      return;
    }
    throw new ForbiddenException(
      `Role ${role} is not authorized for this action`,
    );
  }

  // Called on entry to COMPLIANCE_PROCESSING
  async generateForms(employeeId: string): Promise<void> {
    await this.employeeService.generateComplianceForms(employeeId);
  }

  // COMPLIANCE_PROCESSING -> PENDING_SIGNATURE
  async computeCompliance(employeeId: string): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);

    if (employee.status !== 'COMPLIANCE_PROCESSING') {
      throw new ConflictException(
        `Cannot compute compliance. Employee status is ${employee.status}`,
      );
    }

    const updated = await this.db.$transaction(async (tx) => {
      // Generate forms if not already generated
      const formsCount = await tx.complianceForm.count({
        where: { employeeId },
      });
      if (formsCount === 0) {
        // Evaluate eligibility and generate forms inline in transaction
        const { requiredForms } =
          await this.complianceRuleService.evaluateEligibility(
            employee.job.salary ?? 0,
            tx,
          );

        for (const formType of requiredForms) {
          try {
            await tx.complianceForm.create({
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

      // Advance form statuses from PENDING_GENERATION to PENDING_SIGNATURE
      await tx.complianceForm.updateMany({
        where: { employeeId, status: 'PENDING_GENERATION' },
        data: { status: 'PENDING_SIGNATURE' },
      });

      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: {
          status: 'PENDING_SIGNATURE',
        },
        include: {
          documents: true,
          complianceForms: true,
          milestones: true,
        },
      });

      await this.auditLogService.createLog(
        {
          employeeId,
          fromStatus: employee.status,
          toStatus: 'PENDING_SIGNATURE',
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          note: 'Compliance forms generated and ready for signature',
        },
        tx,
      );

      return emp;
    });

    return mapEmployee(updated);
  }

  // PENDING_SIGNATURE -> DAY1_READY
  async signForm(
    employeeId: string,
    formId: string,
    signedBy: string,
    role: string,
  ): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);

    // Role check: NEW_HIRE (own form) or HR (countersign)
    if (role === 'NEW_HIRE') {
      if (signedBy !== employeeId) {
        throw new ForbiddenException(`New hire can only sign their own form`);
      }
    } else if (role !== 'HR') {
      throw new ForbiddenException(
        `Role ${role} is not authorized to sign forms`,
      );
    }

    if (employee.status !== 'PENDING_SIGNATURE') {
      throw new ConflictException(
        `Cannot sign form. Employee status is ${employee.status}`,
      );
    }

    const form = await this.db.complianceForm.findFirst({
      where: { id: formId, employeeId },
    });
    if (!form) {
      throw new NotFoundException(
        `Compliance form ${formId} not found for employee ${employeeId}`,
      );
    }

    const updatedData = {
      ...(form.data as Record<string, any>),
      signedBy,
      signedAt: new Date().toISOString(),
    };

    await this.db.$transaction(async (tx) => {
      await tx.complianceForm.update({
        where: { id: formId },
        data: {
          status: 'SIGNED',
          data: updatedData,
        },
      });

      // Check if ALL forms are SIGNED inside transaction
      const forms = await tx.complianceForm.findMany({
        where: { employeeId },
      });
      const allSigned = forms.every(
        (f) => f.status === 'SIGNED' || f.status === 'NOT_APPLICABLE',
      );

      if (allSigned) {
        await tx.employee.update({
          where: { id: employeeId },
          data: {
            status: 'DAY1_READY',
          },
        });

        await this.auditLogService.createLog(
          {
            employeeId,
            fromStatus: employee.status,
            toStatus: 'DAY1_READY',
            actorId: signedBy,
            actorRole: role,
            note: 'All compliance forms signed, advanced to Day 1 Ready.',
          },
          tx,
        );

        // Inline Milestone generation in transaction to prevent race conditions
        // Clear any existing milestones for this employee
        await tx.milestone.deleteMany({
          where: { employeeId },
        });

        const types: ('DAY1' | '30' | '60' | '90')[] = [
          'DAY1',
          '30',
          '60',
          '90',
        ];
        for (const type of types) {
          const prismaType =
            type === '30'
              ? 'M30'
              : type === '60'
                ? 'M60'
                : type === '90'
                  ? 'M90'
                  : type;
          await tx.milestone.create({
            data: {
              id: crypto.randomUUID(),
              employeeId,
              type: prismaType,
              status: 'PENDING',
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              checklist: [],
            },
          });
        }
      }
    });

    return this.getEmployeeOrThrow(employeeId);
  }

  async getEmployeeForms(employeeId: string): Promise<ComplianceForm[]> {
    const forms = await this.db.complianceForm.findMany({
      where: { employeeId },
    });
    return forms.map(mapComplianceForm);
  }
}
