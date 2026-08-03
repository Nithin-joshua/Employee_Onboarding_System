import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Employee, ComplianceForm } from '../interfaces/types.interface';
import { MilestoneService } from '../milestone/milestone.service';

export function computeComplianceLogic(employee: Employee): { pfApplicable: boolean; esiApplicable: boolean } {
  const pfApplicable = true; // assume org >=20 employees
  const esiApplicable = employee.job.salary <= 21000;
  return { pfApplicable, esiApplicable };
}

@Injectable()
export class ComplianceService {
  constructor(
    private readonly db: DbService,
    private readonly milestoneService: MilestoneService,
  ) {}

  private getEmployeeOrThrow(id: string): Employee {
    const employee = this.db.employees.find((e) => e.id === id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
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
    throw new ForbiddenException(`Role ${role} is not authorized for this action`);
  }

  // Called on entry to COMPLIANCE_PROCESSING (triggered at the end of approveReview or inside computeCompliance)
  generateForms(employeeId: string) {
    const employee = this.getEmployeeOrThrow(employeeId);
    
    // Clear any existing compliance forms for this employee
    this.db.complianceForms = this.db.complianceForms.filter((f) => f.employeeId !== employeeId);
    employee.complianceFormIds = [];

    const { pfApplicable, esiApplicable } = computeComplianceLogic(employee);

    if (pfApplicable) {
      const pf11: ComplianceForm = {
        id: Math.random().toString(36).substring(7),
        employeeId,
        type: 'PF_FORM11',
        status: 'PENDING_GENERATION',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        data: {},
      };
      const pf2: ComplianceForm = {
        id: Math.random().toString(36).substring(7),
        employeeId,
        type: 'PF_FORM2',
        status: 'PENDING_GENERATION',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        data: {},
      };
      this.db.complianceForms.push(pf11, pf2);
      employee.complianceFormIds.push(pf11.id, pf2.id);
    }

    if (esiApplicable) {
      const esi1: ComplianceForm = {
        id: Math.random().toString(36).substring(7),
        employeeId,
        type: 'ESI_FORM1',
        status: 'PENDING_GENERATION',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        data: {},
      };
      this.db.complianceForms.push(esi1);
      employee.complianceFormIds.push(esi1.id);
    }
  }

  // COMPLIANCE_PROCESSING -> PENDING_SIGNATURE
  computeCompliance(employeeId: string): Employee {
    const employee = this.getEmployeeOrThrow(employeeId);

    if (employee.status !== 'COMPLIANCE_PROCESSING') {
      throw new ConflictException(`Cannot compute compliance. Employee status is ${employee.status}`);
    }

    // Generate forms if not already generated
    if (employee.complianceFormIds.length === 0) {
      this.generateForms(employeeId);
    }

    // Advance form statuses from PENDING_GENERATION to PENDING_SIGNATURE
    const forms = this.db.complianceForms.filter((f) => f.employeeId === employeeId);
    for (const form of forms) {
      if (form.status === 'PENDING_GENERATION') {
        form.status = 'PENDING_SIGNATURE';
      }
    }

    employee.status = 'PENDING_SIGNATURE';
    employee.updatedAt = new Date().toISOString();
    return employee;
  }

  // PENDING_SIGNATURE -> DAY1_READY
  signForm(employeeId: string, formId: string, signedBy: string, role: string): Employee {
    const employee = this.getEmployeeOrThrow(employeeId);

    // Role check: NEW_HIRE (own form) or HR (countersign)
    if (role === 'NEW_HIRE') {
      if (signedBy !== employeeId) {
        throw new ForbiddenException(`New hire can only sign their own form`);
      }
    } else if (role !== 'HR') {
      throw new ForbiddenException(`Role ${role} is not authorized to sign forms`);
    }

    if (employee.status !== 'PENDING_SIGNATURE') {
      throw new ConflictException(`Cannot sign form. Employee status is ${employee.status}`);
    }

    const form = this.db.complianceForms.find((f) => f.id === formId && f.employeeId === employeeId);
    if (!form) {
      throw new NotFoundException(`Compliance form ${formId} not found for employee ${employeeId}`);
    }

    form.status = 'SIGNED';
    form.data.signedBy = signedBy;
    form.data.signedAt = new Date().toISOString();

    // Check if ALL forms are SIGNED
    const forms = this.db.complianceForms.filter((f) => f.employeeId === employeeId);
    const allSigned = forms.every((f) => f.status === 'SIGNED' || f.status === 'NOT_APPLICABLE');

    if (allSigned) {
      employee.status = 'DAY1_READY';
      this.milestoneService.createMilestonesForEmployee(employeeId);
    }

    employee.updatedAt = new Date().toISOString();
    return employee;
  }

  getEmployeeForms(employeeId: string): ComplianceForm[] {
    return this.db.complianceForms.filter((f) => f.employeeId === employeeId);
  }
}
