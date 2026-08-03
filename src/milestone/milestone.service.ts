import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Employee, Milestone } from '../interfaces/types.interface';

@Injectable()
export class MilestoneService {
  constructor(private readonly db: DbService) {}

  private getEmployeeOrThrow(id: string): Employee {
    const employee = this.db.employees.find((e) => e.id === id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  private validateRole(role: string, allowed: string[]) {
    if (allowed.includes('HR') && role === 'HR') {
      return;
    }
    if (allowed.includes('MANAGER') && role === 'MANAGER') {
      return;
    }
    throw new ForbiddenException(`Role ${role} is not authorized for milestone actions`);
  }

  // Create milestones when entering DAY1_READY
  createMilestonesForEmployee(employeeId: string) {
    // Clear any existing milestones for this employee
    this.db.milestones = this.db.milestones.filter((m) => m.employeeId !== employeeId);
    const employee = this.getEmployeeOrThrow(employeeId);
    employee.milestoneIds = [];

    const types: ('DAY1' | '30' | '60' | '90')[] = ['DAY1', '30', '60', '90'];
    for (const type of types) {
      const milestone: Milestone = {
        id: Math.random().toString(36).substring(7),
        employeeId,
        type,
        status: 'PENDING',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        checklist: [],
      };
      this.db.milestones.push(milestone);
      employee.milestoneIds.push(milestone.id);
    }
  }

  // DAY1_READY -> ACTIVE -> MILESTONE_30 -> MILESTONE_60 -> MILESTONE_90 -> ONBOARDING_COMPLETE
  completeMilestone(employeeId: string, type: 'DAY1' | '30' | '60' | '90', role: string): Employee {
    const employee = this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR', 'MANAGER']);

    // Find the milestone
    const milestone = this.db.milestones.find((m) => m.employeeId === employeeId && m.type === type);
    if (!milestone) {
      throw new NotFoundException(`Milestone of type ${type} not found for employee ${employeeId}`);
    }

    if (milestone.status === 'DONE') {
      throw new ConflictException(`Milestone of type ${type} is already completed`);
    }

    // Validate state transition
    if (type === 'DAY1') {
      if (employee.status !== 'DAY1_READY') {
        throw new ConflictException(`Cannot complete DAY1. Employee status is ${employee.status}`);
      }
      employee.status = 'ACTIVE';
    } else if (type === '30') {
      if (employee.status !== 'ACTIVE') {
        throw new ConflictException(`Cannot complete 30. Employee status is ${employee.status}`);
      }
      employee.status = 'MILESTONE_30';
    } else if (type === '60') {
      if (employee.status !== 'MILESTONE_30') {
        throw new ConflictException(`Cannot complete 60. Employee status is ${employee.status}`);
      }
      employee.status = 'MILESTONE_60';
    } else if (type === '90') {
      if (employee.status !== 'MILESTONE_60' && employee.status !== 'MILESTONE_90') {
        throw new ConflictException(`Cannot complete 90. Employee status is ${employee.status}`);
      }
      // If we need to support both transitions
      employee.status = 'ONBOARDING_COMPLETE';
    }

    milestone.status = 'DONE';
    employee.updatedAt = new Date().toISOString();
    return employee;
  }

  getEmployeeMilestones(employeeId: string): Milestone[] {
    return this.db.milestones.filter((m) => m.employeeId === employeeId);
  }
}
