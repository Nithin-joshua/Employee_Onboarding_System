import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Employee, EmployeeStatus } from '../interfaces/types.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';

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

  constructor(private readonly db: DbService) {}

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

    await this.db.auditLog.create({
      data: {
        employeeId: newEmployee.id,
        fromStatus: 'INVITED',
        toStatus: 'INVITED',
        actorId: dto.managerId || 'HR_PORTAL',
        actorRole: 'HR',
        note: `Employee invited by HR. Title: ${dto.title}, Dept: ${dto.department}`,
      },
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

    await this.db.auditLog.create({
      data: {
        employeeId,
        fromStatus: employee.status,
        toStatus: 'DOCUMENTS_PENDING',
        actorId: employeeId,
        actorRole: 'NEW_HIRE',
        note: 'Onboarding preboarding link opened by candidate',
      },
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
