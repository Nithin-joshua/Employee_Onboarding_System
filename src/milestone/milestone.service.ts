import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Employee, Milestone } from '../interfaces/types.interface';
import { mapEmployee } from '../employee/employee.service';

function mapMilestoneToPrismaType(type: string): any {
  if (type === '30') return 'M30';
  if (type === '60') return 'M60';
  if (type === '90') return 'M90';
  return type;
}

function mapPrismaTypeToMilestoneType(type: string): any {
  if (type === 'M30') return '30';
  if (type === 'M60') return '60';
  if (type === 'M90') return '90';
  return type;
}

export function mapMilestone(m: any): Milestone {
  return {
    id: m.id,
    employeeId: m.employeeId,
    type: mapPrismaTypeToMilestoneType(m.type),
    status: m.status as any,
    dueDate: m.dueDate instanceof Date ? m.dueDate.toISOString() : m.dueDate,
    checklist: m.checklist as string[],
  };
}

@Injectable()
export class MilestoneService {
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
  async createMilestonesForEmployee(employeeId: string): Promise<void> {
    // Clear any existing milestones for this employee
    await this.db.milestone.deleteMany({
      where: { employeeId },
    });

    const types: ('DAY1' | '30' | '60' | '90')[] = ['DAY1', '30', '60', '90'];
    for (const type of types) {
      await this.db.milestone.create({
        data: {
          id: Math.random().toString(36).substring(7),
          employeeId,
          type: mapMilestoneToPrismaType(type),
          status: 'PENDING',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          checklist: [],
        },
      });
    }
  }

  // DAY1_READY -> ACTIVE -> MILESTONE_30 -> MILESTONE_60 -> MILESTONE_90 -> ONBOARDING_COMPLETE
  async completeMilestone(employeeId: string, type: 'DAY1' | '30' | '60' | '90', role: string): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR', 'MANAGER']);

    const prismaType = mapMilestoneToPrismaType(type);
    const milestone = await this.db.milestone.findFirst({
      where: { employeeId, type: prismaType },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone of type ${type} not found for employee ${employeeId}`);
    }

    if (milestone.status === 'DONE') {
      throw new ConflictException(`Milestone of type ${type} is already completed`);
    }

    // Validate state transition
    let targetStatus = employee.status;
    if (type === 'DAY1') {
      if (employee.status !== 'DAY1_READY') {
        throw new ConflictException(`Cannot complete DAY1. Employee status is ${employee.status}`);
      }
      targetStatus = 'ACTIVE';
    } else if (type === '30') {
      if (employee.status !== 'ACTIVE') {
        throw new ConflictException(`Cannot complete 30. Employee status is ${employee.status}`);
      }
      targetStatus = 'MILESTONE_30';
    } else if (type === '60') {
      if (employee.status !== 'MILESTONE_30') {
        throw new ConflictException(`Cannot complete 60. Employee status is ${employee.status}`);
      }
      targetStatus = 'MILESTONE_60';
    } else if (type === '90') {
      if (employee.status !== 'MILESTONE_60' && employee.status !== 'MILESTONE_90') {
        throw new ConflictException(`Cannot complete 90. Employee status is ${employee.status}`);
      }
      targetStatus = 'ONBOARDING_COMPLETE';
    }

    await this.db.milestone.update({
      where: { id: milestone.id },
      data: { status: 'DONE' },
    });

    const updated = await this.db.employee.update({
      where: { id: employeeId },
      data: {
        status: targetStatus,
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
        toStatus: targetStatus,
        actorId: role === 'NEW_HIRE' ? employeeId : 'MANAGER_PORTAL',
        actorRole: role as any,
        note: `Milestone ${type} completed.`,
      },
    });

    return mapEmployee(updated);
  }

  async getEmployeeMilestones(employeeId: string): Promise<Milestone[]> {
    const milestones = await this.db.milestone.findMany({
      where: { employeeId },
    });
    return milestones.map(mapMilestone);
  }
}
