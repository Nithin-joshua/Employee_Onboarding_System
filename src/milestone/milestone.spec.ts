import { Test, TestingModule } from '@nestjs/testing';
import { MilestoneService } from './milestone.service';
import { DbService } from '../db/db.service';
import { AuditLogService } from '../db/audit-log.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('MilestoneService Unit Tests', () => {
  let service: MilestoneService;
  let db: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
  });

  describe('completeMilestone', () => {
    it('should throw NotFoundException if employee does not exist', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue(null);
      await expect(
        service.completeMilestone('emp_123', 'DAY1', 'HR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user role is unauthorized', async () => {
      jest
        .spyOn(db.employee, 'findUnique')
        .mockResolvedValue({ id: 'emp_123', status: 'DAY1_READY' } as any);
      await expect(
        service.completeMilestone('emp_123', 'DAY1', 'NEW_HIRE'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if transition status does not match current state', async () => {
      jest
        .spyOn(db.employee, 'findUnique')
        .mockResolvedValue({ id: 'emp_123', status: 'ACTIVE' } as any);
      jest.spyOn(db.milestone, 'findFirst').mockResolvedValue({
        id: 'm_123',
        type: 'DAY1',
        status: 'PENDING',
      } as any);

      await expect(
        service.completeMilestone('emp_123', 'DAY1', 'HR'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if milestone is already completed', async () => {
      jest
        .spyOn(db.employee, 'findUnique')
        .mockResolvedValue({ id: 'emp_123', status: 'DAY1_READY' } as any);
      jest.spyOn(db.milestone, 'findFirst').mockResolvedValue({
        id: 'm_123',
        type: 'DAY1',
        status: 'DONE',
      } as any);

      await expect(
        service.completeMilestone('emp_123', 'DAY1', 'HR'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
