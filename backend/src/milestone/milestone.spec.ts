import { Test, TestingModule } from '@nestjs/testing';
import { MilestoneService } from './milestone.service';
import { MilestoneController } from './milestone.controller';
import { DbService } from '../db/db.service';
import { AuditLogService } from '../db/audit-log.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MilestoneType, Role } from '@prisma/client';

describe('Milestone unit tests', () => {
  let service: MilestoneService;
  let db: DbService;
  let auditLogService: AuditLogService;
  let controller: MilestoneController;

  const mockEmployee = {
    id: 'emp_123',
    status: 'DAY1_READY',
    personal: { name: 'John Doe', email: 'john@example.com' },
    job: { managerId: 'mgr_123' },
    documents: [],
    complianceForms: [],
    milestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MilestoneController],
      providers: [
        MilestoneService,
        {
          provide: DbService,
          useValue: {
            employee: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            milestone: {
              deleteMany: jest.fn(),
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((cb) => cb(db)),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            createLog: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MilestoneService>(MilestoneService);
    db = module.get<DbService>(DbService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
    controller = module.get<MilestoneController>(MilestoneController);
  });

  describe('createMilestonesForEmployee', () => {
    it('should clear old milestones and create DAY1, M30, M60, M90 milestones', async () => {
      const employeeId = 'emp_123';
      jest.spyOn(db.milestone, 'deleteMany').mockResolvedValue({ count: 2 });
      jest.spyOn(db.milestone, 'create').mockResolvedValue({} as any);

      await service.createMilestonesForEmployee(employeeId);

      expect(db.milestone.deleteMany).toHaveBeenCalledWith({
        where: { employeeId },
      });
      expect(db.milestone.create).toHaveBeenCalledTimes(4);
      expect(db.milestone.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId,
            type: 'DAY1',
            status: 'PENDING',
          }),
        }),
      );
      expect(db.milestone.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId,
            type: 'M30',
            status: 'PENDING',
          }),
        }),
      );
      expect(db.milestone.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId,
            type: 'M60',
            status: 'PENDING',
          }),
        }),
      );
      expect(db.milestone.create).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId,
            type: 'M90',
            status: 'PENDING',
          }),
        }),
      );
    });
  });

  describe('completeMilestone Success Transitions', () => {
    const testCases = [
      {
        type: 'DAY1' as const,
        initialStatus: 'DAY1_READY',
        targetStatus: 'ACTIVE',
        prismaType: 'DAY1' as MilestoneType,
      },
      {
        type: '30' as const,
        initialStatus: 'ACTIVE',
        targetStatus: 'MILESTONE_30',
        prismaType: 'M30' as MilestoneType,
      },
      {
        type: '60' as const,
        initialStatus: 'MILESTONE_30',
        targetStatus: 'MILESTONE_60',
        prismaType: 'M60' as MilestoneType,
      },
      {
        type: '90' as const,
        initialStatus: 'MILESTONE_60',
        targetStatus: 'ONBOARDING_COMPLETE',
        prismaType: 'M90' as MilestoneType,
      },
      {
        type: '90' as const,
        initialStatus: 'MILESTONE_90',
        targetStatus: 'ONBOARDING_COMPLETE',
        prismaType: 'M90' as MilestoneType,
      },
    ];

    testCases.forEach(({ type, initialStatus, targetStatus, prismaType }) => {
      it(`should successfully transition milestone type ${type} (${initialStatus} -> ${targetStatus}) and update status and audit log`, async () => {
        const empBefore = { ...mockEmployee, status: initialStatus };
        const empAfter = { ...mockEmployee, status: targetStatus };

        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValue(empBefore as any);
        jest.spyOn(db.milestone, 'findFirst').mockResolvedValue({
          id: 'm_123',
          type: prismaType,
          status: 'PENDING',
        } as any);
        jest.spyOn(db.milestone, 'update').mockResolvedValue({} as any);
        jest.spyOn(db.employee, 'update').mockResolvedValue(empAfter as any);

        const result = await service.completeMilestone('emp_123', type, 'HR');

        expect(db.milestone.update).toHaveBeenCalledWith({
          where: { id: 'm_123' },
          data: { status: 'DONE' },
        });
        expect(db.employee.update).toHaveBeenCalledWith({
          where: { id: 'emp_123' },
          data: { status: targetStatus },
          include: {
            documents: true,
            complianceForms: true,
            milestones: true,
          },
        });
        expect(auditLogService.createLog).toHaveBeenCalledWith(
          {
            employeeId: 'emp_123',
            fromStatus: initialStatus,
            toStatus: targetStatus,
            actorId: 'MANAGER_PORTAL',
            actorRole: 'HR',
            note: `Milestone ${type} completed.`,
          },
          db,
        );
        expect(result.status).toBe(targetStatus);
      });
    });
  });

  describe('completeMilestone Failure Transitions', () => {
    it('should throw NotFoundException if employee does not exist', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue(null);
      await expect(
        service.completeMilestone('emp_123', 'DAY1', 'HR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user role is unauthorized', async () => {
      jest
        .spyOn(db.employee, 'findUnique')
        .mockResolvedValue({ ...mockEmployee, status: 'DAY1_READY' } as any);
      await expect(
        service.completeMilestone('emp_123', 'DAY1', 'NEW_HIRE'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if milestone is not found', async () => {
      jest
        .spyOn(db.employee, 'findUnique')
        .mockResolvedValue({ ...mockEmployee, status: 'DAY1_READY' } as any);
      jest.spyOn(db.milestone, 'findFirst').mockResolvedValue(null);

      await expect(
        service.completeMilestone('emp_123', 'DAY1', 'HR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if milestone is already completed', async () => {
      jest
        .spyOn(db.employee, 'findUnique')
        .mockResolvedValue({ ...mockEmployee, status: 'DAY1_READY' } as any);
      jest.spyOn(db.milestone, 'findFirst').mockResolvedValue({
        id: 'm_123',
        type: 'DAY1',
        status: 'DONE',
      } as any);

      await expect(
        service.completeMilestone('emp_123', 'DAY1', 'HR'),
      ).rejects.toThrow(ConflictException);
    });

    const statusMismatches = [
      { type: 'DAY1' as const, currentStatus: 'ACTIVE' },
      { type: '30' as const, currentStatus: 'DAY1_READY' },
      { type: '60' as const, currentStatus: 'ACTIVE' },
      { type: '90' as const, currentStatus: 'MILESTONE_30' },
    ];

    statusMismatches.forEach(({ type, currentStatus }) => {
      it(`should throw ConflictException if completing ${type} but employee status is ${currentStatus}`, async () => {
        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValue({ ...mockEmployee, status: currentStatus } as any);
        jest.spyOn(db.milestone, 'findFirst').mockResolvedValue({
          id: 'm_123',
          type:
            type === '30'
              ? 'M30'
              : type === '60'
                ? 'M60'
                : type === '90'
                  ? 'M90'
                  : 'DAY1',
          status: 'PENDING',
        } as any);

        await expect(
          service.completeMilestone('emp_123', type, 'HR'),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('getEmployeeMilestones', () => {
    it('should query milestones and map them correctly', async () => {
      const now = new Date();
      jest.spyOn(db.milestone, 'findMany').mockResolvedValue([
        {
          id: 'm_1',
          employeeId: 'emp_123',
          type: 'DAY1' as MilestoneType,
          status: 'PENDING',
          dueDate: now,
          checklist: ['Check 1'],
        },
        {
          id: 'm_2',
          employeeId: 'emp_123',
          type: 'M30' as MilestoneType,
          status: 'DONE',
          dueDate: now,
          checklist: [],
        },
      ] as any);

      const result = await service.getEmployeeMilestones('emp_123');

      expect(db.milestone.findMany).toHaveBeenCalledWith({
        where: { employeeId: 'emp_123' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'm_1',
        employeeId: 'emp_123',
        type: 'DAY1',
        status: 'PENDING',
        dueDate: now.toISOString(),
        checklist: ['Check 1'],
      });
      expect(result[1]).toEqual({
        id: 'm_2',
        employeeId: 'emp_123',
        type: '30',
        status: 'DONE',
        dueDate: now.toISOString(),
        checklist: [],
      });
    });
  });

  describe('MilestoneController', () => {
    it('should delegate getMilestones to service.getEmployeeMilestones', async () => {
      const mockMilestones = [{ id: 'm1', type: 'DAY1' } as any];
      jest
        .spyOn(service, 'getEmployeeMilestones')
        .mockResolvedValue(mockMilestones);

      const result = await controller.getMilestones('emp_123');
      expect(service.getEmployeeMilestones).toHaveBeenCalledWith('emp_123');
      expect(result).toBe(mockMilestones);
    });

    it('should delegate complete to service.completeMilestone', async () => {
      const mockResult = { id: 'emp_123' } as any;
      jest.spyOn(service, 'completeMilestone').mockResolvedValue(mockResult);

      const req = { user: { role: 'HR' } } as any;
      const result = await controller.complete(
        'emp_123',
        { type: 'DAY1' },
        req,
      );
      expect(service.completeMilestone).toHaveBeenCalledWith(
        'emp_123',
        'DAY1',
        'HR',
      );
      expect(result).toBe(mockResult);
    });

    it('should verify route annotations and metadata', () => {
      const path = Reflect.getMetadata('path', MilestoneController);
      expect(path).toBe('employees/:employeeId');

      const getMilestonesPath = Reflect.getMetadata(
        'path',
        controller.getMilestones,
      );
      expect(getMilestonesPath).toBe('milestones');

      const completePath = Reflect.getMetadata('path', controller.complete);
      expect(completePath).toBe('complete-milestone');
    });
  });
});
