import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Employee, EmployeeStatus, Document, ComplianceForm, Milestone } from '../interfaces/types.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly db: DbService) {}

  private getEmployeeOrThrow(id: string): Employee {
    const employee = this.db.employees.find((e) => e.id === id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  createEmployee(dto: CreateEmployeeDto): Employee {
    const newEmployee: Employee = {
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
      documentIds: [],
      complianceFormIds: [],
      milestoneIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.employees.push(newEmployee);
    return newEmployee;
  }

  getEmployee(id: string): Employee {
    return this.getEmployeeOrThrow(id);
  }

  // INVITED -> DOCUMENTS_PENDING
  openPreboardingLink(employeeId: string, role: string): Employee {
    const employee = this.getEmployeeOrThrow(employeeId);

    if (employee.status !== 'INVITED') {
      throw new ConflictException(`Cannot open preboarding link. Employee status is ${employee.status}`);
    }

    // Role check: none specified, but let's accept any role.
    employee.status = 'DOCUMENTS_PENDING';
    employee.updatedAt = new Date().toISOString();
    return employee;
  }

  // Helper to validate roles
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
