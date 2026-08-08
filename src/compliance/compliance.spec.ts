import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { DbService } from '../db/db.service';
import { MilestoneService } from '../milestone/milestone.service';
import { EmployeeService } from '../employee/employee.service';
import { AuditLogService } from '../db/audit-log.service';
import { ComplianceRuleService } from '../employee/compliance-rule.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('ComplianceService Unit Tests', () => {
  let service: ComplianceService;
  let db: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        {
          provide: DbService,
          useValue: {
            employee: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            complianceForm: {
              count: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            milestone: {
              deleteMany: jest.fn(),
              create: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((cb) => cb(db)),
          },
        },
        {
          provide: MilestoneService,
          useValue: {
            createMilestonesForEmployee: jest.fn(),
          },
        },
        {
          provide: EmployeeService,
          useValue: {
            generateComplianceForms: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            createLog: jest.fn(),
          },
        },
        {
          provide: ComplianceRuleService,
          useValue: {
            evaluateEligibility: jest
              .fn()
              .mockResolvedValue({ requiredForms: ['PF_FORM11'] }),
          },
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
    db = module.get<DbService>(DbService);
  });

  describe('computeCompliance', () => {
    it('should throw NotFoundException if employee is not found', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue(null);
      await expect(service.computeCompliance('emp_123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if status is not COMPLIANCE_PROCESSING', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'INVITED',
        job: { salary: 15000 },
      } as any);

      await expect(service.computeCompliance('emp_123')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('signForm', () => {
    it('should throw ForbiddenException if signee role is not authorized', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'PENDING_SIGNATURE',
        job: { salary: 15000 },
      } as any);

      await expect(
        service.signForm('emp_123', 'form_123', 'John Doe', 'MANAGER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if NEW_HIRE attempts to sign for someone else', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'PENDING_SIGNATURE',
        job: { salary: 15000 },
      } as any);

      await expect(
        service.signForm('emp_123', 'form_123', 'other_emp', 'NEW_HIRE'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
