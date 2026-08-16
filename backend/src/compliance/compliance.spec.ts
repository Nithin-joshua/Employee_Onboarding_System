import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceService, computeComplianceLogic, mapComplianceForm } from './compliance.service';
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
import { ComplianceController } from './compliance.controller';
import { PdfGeneratorService } from '../employee/pdf-generator.service';
import { AbacOwnershipGuard } from '../common/guards/abac-ownership.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Reflector } from '@nestjs/core';

describe('Compliance Module Tests', () => {
  let service: ComplianceService;
  let db: DbService;
  let complianceRuleService: ComplianceRuleService;
  let auditLogService: AuditLogService;

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
              create: jest.fn(),
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
            getEmployee: jest.fn(),
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
    complianceRuleService = module.get<ComplianceRuleService>(
      ComplianceRuleService,
    );
    auditLogService = module.get<AuditLogService>(AuditLogService);
  });

  describe('ComplianceService Unit Tests', () => {
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

      it('should successfully compute compliance and transition status', async () => {
        const mockEmployee = {
          id: 'emp_123',
          status: 'COMPLIANCE_PROCESSING',
          job: { salary: 15000 },
          personal: { name: 'Test User', email: 'test@example.com' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };
        const mockUpdatedEmployee = {
          ...mockEmployee,
          status: 'PENDING_SIGNATURE',
        };

        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValue(mockEmployee as any);
        jest.spyOn(db.complianceForm, 'count').mockResolvedValue(0);
        jest
          .spyOn(complianceRuleService, 'evaluateEligibility')
          .mockResolvedValue({
            requiredForms: ['PF_FORM11', 'ESI_FORM1'],
          });
        jest.spyOn(db.complianceForm, 'create').mockResolvedValue({} as any);
        jest
          .spyOn(db.complianceForm, 'updateMany')
          .mockResolvedValue({ count: 2 });
        jest
          .spyOn(db.employee, 'update')
          .mockResolvedValue(mockUpdatedEmployee as any);
        jest.spyOn(auditLogService, 'createLog').mockResolvedValue({} as any);

        const result = await service.computeCompliance('emp_123');

        expect(result.status).toBe('PENDING_SIGNATURE');
        expect(db.employee.findUnique).toHaveBeenCalledWith({
          where: { id: 'emp_123' },
          include: {
            documents: true,
            complianceForms: true,
            milestones: true,
          },
        });
        expect(complianceRuleService.evaluateEligibility).toHaveBeenCalledWith(
          15000,
          db,
        );
        expect(db.complianceForm.create).toHaveBeenCalledTimes(2);
        expect(db.complianceForm.updateMany).toHaveBeenCalledWith({
          where: { employeeId: 'emp_123', status: 'PENDING_GENERATION' },
          data: { status: 'PENDING_SIGNATURE' },
        });
        expect(db.employee.update).toHaveBeenCalledWith({
          where: { id: 'emp_123' },
          data: { status: 'PENDING_SIGNATURE' },
          include: {
            documents: true,
            complianceForms: true,
            milestones: true,
          },
        });
        expect(auditLogService.createLog).toHaveBeenCalledWith(
          {
            employeeId: 'emp_123',
            fromStatus: 'COMPLIANCE_PROCESSING',
            toStatus: 'PENDING_SIGNATURE',
            actorId: 'SYSTEM',
            actorRole: 'SYSTEM',
            note: 'Compliance forms generated and ready for signature',
          },
          db,
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

      it('should throw ConflictException if employee is not in PENDING_SIGNATURE status', async () => {
        jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
          id: 'emp_123',
          status: 'INVITED',
          job: { salary: 15000 },
        } as any);

        await expect(
          service.signForm('emp_123', 'form_123', 'emp_123', 'NEW_HIRE'),
        ).rejects.toThrow(ConflictException);
      });

      it('should throw NotFoundException if form is not found', async () => {
        jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
          id: 'emp_123',
          status: 'PENDING_SIGNATURE',
          job: { salary: 15000 },
          personal: { name: 'Test User', email: 'test@example.com' },
        } as any);
        jest.spyOn(db.complianceForm, 'findFirst').mockResolvedValue(null);

        await expect(
          service.signForm('emp_123', 'form_123', 'emp_123', 'NEW_HIRE'),
        ).rejects.toThrow(NotFoundException);
      });

      it('should successfully sign form (NEW_HIRE own form) and not transition if forms remain unsigned', async () => {
        const mockEmployee = {
          id: 'emp_123',
          status: 'PENDING_SIGNATURE',
          job: { salary: 15000 },
          personal: { name: 'Test User', email: 'test@example.com' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };
        const mockForm = {
          id: 'form_123',
          employeeId: 'emp_123',
          type: 'PF_FORM11',
          status: 'PENDING_SIGNATURE',
          deadline: new Date(),
          data: {},
        };

        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValue(mockEmployee as any);
        jest
          .spyOn(db.complianceForm, 'findFirst')
          .mockResolvedValue(mockForm as any);
        jest.spyOn(db.complianceForm, 'update').mockResolvedValue({} as any);
        jest.spyOn(db.complianceForm, 'findMany').mockResolvedValue([
          { ...mockForm, status: 'SIGNED' },
          { id: 'form_456', status: 'PENDING_SIGNATURE' },
        ] as any);

        const result = await service.signForm(
          'emp_123',
          'form_123',
          'emp_123',
          'NEW_HIRE',
        );

        expect(db.complianceForm.update).toHaveBeenCalledWith({
          where: { id: 'form_123' },
          data: {
            status: 'SIGNED',
            data: expect.objectContaining({ signedBy: 'emp_123' }),
          },
        });
        expect(db.employee.update).not.toHaveBeenCalled();
      });

      it('should successfully sign form, transition to DAY1_READY and generate milestones when all forms are signed', async () => {
        const mockEmployee = {
          id: 'emp_123',
          status: 'PENDING_SIGNATURE',
          job: { salary: 15000 },
          personal: { name: 'Test User', email: 'test@example.com' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };
        const mockForm = {
          id: 'form_123',
          employeeId: 'emp_123',
          type: 'PF_FORM11',
          status: 'PENDING_SIGNATURE',
          deadline: new Date(),
          data: {},
        };

        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValueOnce(mockEmployee as any)
          .mockResolvedValueOnce({
            ...mockEmployee,
            status: 'DAY1_READY',
          } as any);
        jest
          .spyOn(db.complianceForm, 'findFirst')
          .mockResolvedValue(mockForm as any);
        jest.spyOn(db.complianceForm, 'update').mockResolvedValue({} as any);
        jest
          .spyOn(db.complianceForm, 'findMany')
          .mockResolvedValue([{ ...mockForm, status: 'SIGNED' }] as any);
        jest.spyOn(db.employee, 'update').mockResolvedValue({} as any);
        jest.spyOn(db.milestone, 'deleteMany').mockResolvedValue({ count: 0 });
        jest.spyOn(db.milestone, 'create').mockResolvedValue({} as any);

        const result = await service.signForm(
          'emp_123',
          'form_123',
          'emp_123',
          'NEW_HIRE',
        );

        expect(result.status).toBe('DAY1_READY');
        expect(db.employee.update).toHaveBeenCalledWith({
          where: { id: 'emp_123' },
          data: { status: 'DAY1_READY' },
        });
        expect(db.milestone.deleteMany).toHaveBeenCalledWith({
          where: { employeeId: 'emp_123' },
        });
        expect(db.milestone.create).toHaveBeenCalledTimes(4); // DAY1, 30, 60, 90
        expect(auditLogService.createLog).toHaveBeenCalledWith(
          {
            employeeId: 'emp_123',
            fromStatus: 'PENDING_SIGNATURE',
            toStatus: 'DAY1_READY',
            actorId: 'emp_123',
            actorRole: 'NEW_HIRE',
            note: 'All compliance forms signed, advanced to Day 1 Ready.',
          },
          db,
        );
      });
    });

    describe('getEmployeeForms', () => {
      it('should return mapped compliance forms', async () => {
        const mockDeadline = new Date();
        const mockForm = {
          id: 'form_123',
          employeeId: 'emp_123',
          type: 'PF_FORM11',
          status: 'PENDING_SIGNATURE',
          deadline: mockDeadline,
          data: { foo: 'bar' },
        };
        jest
          .spyOn(db.complianceForm, 'findMany')
          .mockResolvedValue([mockForm] as any);

        const result = await service.getEmployeeForms('emp_123');

        expect(result).toEqual([
          {
            id: 'form_123',
            employeeId: 'emp_123',
            type: 'PF_FORM11',
            status: 'PENDING_SIGNATURE',
            deadline: mockDeadline.toISOString(),
            data: { foo: 'bar' },
          },
        ]);
      });
    });

    describe('computeComplianceLogic', () => {
      it('should compute ESI eligibility based on salary', () => {
        const resLow = computeComplianceLogic({
          job: { salary: 15000 },
        } as any);
        expect(resLow.pfApplicable).toBe(true);
        expect(resLow.esiApplicable).toBe(true);

        const resHigh = computeComplianceLogic({
          job: { salary: 25000 },
        } as any);
        expect(resHigh.pfApplicable).toBe(true);
        expect(resHigh.esiApplicable).toBe(false);

        const resMissing = computeComplianceLogic({ job: {} } as any);
        expect(resMissing.esiApplicable).toBe(true);
      });
    });

    describe('validateRole private method', () => {
      it('should allow valid roles and throw ForbiddenException on unauthorized roles', () => {
        const serviceWithValidate = service as unknown as {
          validateRole: (r: string, a: string[]) => void;
        };
        expect(() =>
          serviceWithValidate.validateRole('SYSTEM', ['SYSTEM']),
        ).not.toThrow();
        expect(() => serviceWithValidate.validateRole('HR', ['HR'])).not.toThrow();
        expect(() =>
          serviceWithValidate.validateRole('NEW_HIRE', ['NEW_HIRE']),
        ).not.toThrow();
        expect(() => serviceWithValidate.validateRole('MANAGER', ['HR'])).toThrow(
          ForbiddenException,
        );
      });
    });

    describe('generateForms', () => {
      it('should call employeeService.generateComplianceForms', async () => {
        const empService = (service as unknown as {
          employeeService: { generateComplianceForms: jest.Mock };
        }).employeeService;
        await service.generateForms('emp_123');
        expect(empService.generateComplianceForms).toHaveBeenCalledWith(
          'emp_123',
        );
      });
    });

    describe('computeCompliance edge cases', () => {
      it('should ignore Prisma P2002 duplicate key constraint and continue', async () => {
        const mockEmployee = {
          id: 'emp_123',
          status: 'COMPLIANCE_PROCESSING',
          job: { salary: 15000 },
          personal: { name: 'Test User', email: 'test@example.com' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };
        const mockUpdatedEmployee = {
          ...mockEmployee,
          status: 'PENDING_SIGNATURE',
        };

        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValue(mockEmployee as any);
        jest.spyOn(db.complianceForm, 'count').mockResolvedValue(0);
        jest
          .spyOn(complianceRuleService, 'evaluateEligibility')
          .mockResolvedValue({
            requiredForms: ['PF_FORM11', 'ESI_FORM1'],
          });

        const prismaError = new Error('Unique constraint failed');
        (prismaError as any).code = 'P2002';
        jest
          .spyOn(db.complianceForm, 'create')
          .mockRejectedValueOnce(prismaError)
          .mockResolvedValueOnce({} as any);

        jest
          .spyOn(db.complianceForm, 'updateMany')
          .mockResolvedValue({ count: 1 });
        jest
          .spyOn(db.employee, 'update')
          .mockResolvedValue(mockUpdatedEmployee as any);
        jest.spyOn(auditLogService, 'createLog').mockResolvedValue({} as any);

        const result = await service.computeCompliance('emp_123');
        expect(result.status).toBe('PENDING_SIGNATURE');
        expect(db.complianceForm.create).toHaveBeenCalledTimes(2);
      });

      it('should rethrow non-P2002 errors during compliance form generation', async () => {
        const mockEmployee = {
          id: 'emp_123',
          status: 'COMPLIANCE_PROCESSING',
          job: { salary: 15000 },
          personal: { name: 'Test User', email: 'test@example.com' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };

        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValue(mockEmployee as any);
        jest.spyOn(db.complianceForm, 'count').mockResolvedValue(0);
        jest
          .spyOn(complianceRuleService, 'evaluateEligibility')
          .mockResolvedValue({
            requiredForms: ['PF_FORM11'],
          });

        const genericError = new Error('Database connection lost');
        jest.spyOn(db.complianceForm, 'create').mockRejectedValue(genericError);

        await expect(service.computeCompliance('emp_123')).rejects.toThrow(
          'Database connection lost',
        );
      });

      it('should skip form generation if formsCount > 0', async () => {
        const mockEmployee = {
          id: 'emp_123',
          status: 'COMPLIANCE_PROCESSING',
          job: { salary: 15000 },
          personal: { name: 'Test User', email: 'test@example.com' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };
        const mockUpdatedEmployee = {
          ...mockEmployee,
          status: 'PENDING_SIGNATURE',
        };

        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValue(mockEmployee as any);
        jest.spyOn(db.complianceForm, 'count').mockResolvedValue(2);
        jest
          .spyOn(db.complianceForm, 'updateMany')
          .mockResolvedValue({ count: 2 });
        jest
          .spyOn(db.employee, 'update')
          .mockResolvedValue(mockUpdatedEmployee as any);
        jest.spyOn(auditLogService, 'createLog').mockResolvedValue({} as any);

        const result = await service.computeCompliance('emp_123');
        expect(result.status).toBe('PENDING_SIGNATURE');
        expect(
          complianceRuleService.evaluateEligibility,
        ).not.toHaveBeenCalled();
      });

      it('should default salary to 0 if not provided', async () => {
        const mockEmployee = {
          id: 'emp_123',
          status: 'COMPLIANCE_PROCESSING',
          job: {},
          personal: { name: 'Test User', email: 'test@example.com' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };
        const mockUpdatedEmployee = {
          ...mockEmployee,
          status: 'PENDING_SIGNATURE',
        };

        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValue(mockEmployee as any);
        jest.spyOn(db.complianceForm, 'count').mockResolvedValue(0);
        jest
          .spyOn(complianceRuleService, 'evaluateEligibility')
          .mockResolvedValue({
            requiredForms: [],
          });
        jest
          .spyOn(db.complianceForm, 'updateMany')
          .mockResolvedValue({ count: 0 });
        jest
          .spyOn(db.employee, 'update')
          .mockResolvedValue(mockUpdatedEmployee as any);
        jest.spyOn(auditLogService, 'createLog').mockResolvedValue({} as any);

        await service.computeCompliance('emp_123');
        expect(complianceRuleService.evaluateEligibility).toHaveBeenCalledWith(
          0,
          db,
        );
      });
    });

    describe('mapComplianceForm', () => {
      it('should handle deadline when it is a string instead of a Date instance', () => {
        const mockDeadlineStr = '2026-08-08T00:00:00.000Z';
        const cf = {
          id: 'cf_123',
          employeeId: 'emp_123',
          type: 'PF_FORM11',
          status: 'PENDING_SIGNATURE',
          deadline: mockDeadlineStr,
          data: { key: 'value' },
        };
        const mapped = mapComplianceForm(cf as any);
        expect(mapped.deadline).toBe(mockDeadlineStr);
      });
    });

    describe('signForm HR role', () => {
      it('should successfully sign form as HR', async () => {
        const mockEmployee = {
          id: 'emp_123',
          status: 'PENDING_SIGNATURE',
          job: { salary: 15000 },
          personal: { name: 'Test User', email: 'test@example.com' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };
        const mockForm = {
          id: 'form_123',
          employeeId: 'emp_123',
          type: 'PF_FORM11',
          status: 'PENDING_SIGNATURE',
          deadline: new Date(),
          data: {},
        };

        jest
          .spyOn(db.employee, 'findUnique')
          .mockResolvedValueOnce(mockEmployee as any)
          .mockResolvedValueOnce({
            ...mockEmployee,
            status: 'DAY1_READY',
          } as any);
        jest
          .spyOn(db.complianceForm, 'findFirst')
          .mockResolvedValue(mockForm as any);
        jest.spyOn(db.complianceForm, 'update').mockResolvedValue({} as any);
        jest
          .spyOn(db.complianceForm, 'findMany')
          .mockResolvedValue([{ ...mockForm, status: 'SIGNED' }] as any);
        jest.spyOn(db.employee, 'update').mockResolvedValue({} as any);
        jest.spyOn(db.milestone, 'deleteMany').mockResolvedValue({ count: 0 });
        jest.spyOn(db.milestone, 'create').mockResolvedValue({} as any);

        const result = await service.signForm(
          'emp_123',
          'form_123',
          'hr-1',
          'HR',
        );
        expect(result.status).toBe('DAY1_READY');
      });
    });
  });

  describe('ComplianceController Unit Tests', () => {
    let controller: ComplianceController;
    let complianceService: ComplianceService;
    let pdfGeneratorService: PdfGeneratorService;
    let employeeService: EmployeeService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ComplianceController],
        providers: [
          {
            provide: ComplianceService,
            useValue: {
              getEmployeeForms: jest.fn(),
              computeCompliance: jest.fn(),
              signForm: jest.fn(),
            },
          },
          {
            provide: PdfGeneratorService,
            useValue: {
              generateFormPDF: jest.fn(),
            },
          },
          {
            provide: EmployeeService,
            useValue: {
              getEmployee: jest.fn(),
            },
          },
          {
            provide: DbService,
            useValue: {},
          },
        ],
      }).compile();

      controller = module.get<ComplianceController>(ComplianceController);
      complianceService = module.get<ComplianceService>(ComplianceService);
      pdfGeneratorService =
        module.get<PdfGeneratorService>(PdfGeneratorService);
      employeeService = module.get<EmployeeService>(EmployeeService);
    });

    describe('Decorators & Guard configuration', () => {
      it('should have AbacOwnershipGuard applied', () => {
        const guards = Reflect.getMetadata('__guards__', ComplianceController);
        expect(guards).toContain(AbacOwnershipGuard);
      });

      it('should have correct Roles metadata', () => {
        const reflector = new Reflector();
        const rolesForms = reflector.get(
          ROLES_KEY,
          controller.getEmployeeForms,
        );
        const rolesCompute = reflector.get(ROLES_KEY, controller.compute);
        const rolesSign = reflector.get(ROLES_KEY, controller.sign);
        const rolesDownload = reflector.get(ROLES_KEY, controller.downloadPdf);

        expect(rolesForms).toEqual(['HR', 'MANAGER', 'NEW_HIRE']);
        expect(rolesCompute).toEqual(['HR', 'NEW_HIRE', 'SYSTEM']);
        expect(rolesSign).toEqual(['NEW_HIRE', 'HR']);
        expect(rolesDownload).toEqual(['NEW_HIRE', 'HR', 'MANAGER']);
      });
    });

    describe('getEmployeeForms', () => {
      it('should delegate to complianceService.getEmployeeForms', async () => {
        jest.spyOn(complianceService, 'getEmployeeForms').mockResolvedValue([]);
        await controller.getEmployeeForms('emp_123');
        expect(complianceService.getEmployeeForms).toHaveBeenCalledWith(
          'emp_123',
        );
      });
    });

    describe('compute', () => {
      it('should delegate to complianceService.computeCompliance', async () => {
        jest
          .spyOn(complianceService, 'computeCompliance')
          .mockResolvedValue({} as any);
        await controller.compute('emp_123');
        expect(complianceService.computeCompliance).toHaveBeenCalledWith(
          'emp_123',
        );
      });
    });

    describe('sign', () => {
      it('should delegate to complianceService.signForm if authorized', async () => {
        const req = {
          user: { role: 'NEW_HIRE', employeeId: 'emp_123' },
        } as any;
        jest.spyOn(complianceService, 'signForm').mockResolvedValue({} as any);

        await controller.sign(
          'emp_123',
          'form_123',
          { signedBy: 'emp_123' },
          req,
        );

        expect(complianceService.signForm).toHaveBeenCalledWith(
          'emp_123',
          'form_123',
          'emp_123',
          'NEW_HIRE',
        );
      });

      it('should throw ForbiddenException if NEW_HIRE accesses another employee forms', () => {
        const req = {
          user: { role: 'NEW_HIRE', employeeId: 'emp_123' },
        } as any;

        expect(() =>
          controller.sign(
            'emp_other',
            'form_123',
            { signedBy: 'emp_123' },
            req,
          ),
        ).toThrow(ForbiddenException);
      });
    });

    describe('downloadPdf', () => {
      it('should throw ForbiddenException if NEW_HIRE accesses another employee record', async () => {
        const req = {
          user: { role: 'NEW_HIRE', employeeId: 'emp_123' },
        } as any;
        const res = {} as any;

        await expect(
          controller.downloadPdf('emp_other', 'form_123', res, req),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should generate PDF and set appropriate response headers', async () => {
        const req = {
          user: { role: 'NEW_HIRE', employeeId: 'emp_123' },
        } as any;
        const res = {
          setHeader: jest.fn(),
          end: jest.fn(),
        } as any;

        const mockEmployee = {
          personal: {
            name: 'Jane Doe',
            dob: '1990-01-01',
            phone: '555-1234',
            email: 'jane@example.com',
          },
          job: {
            title: 'Engineer',
            department: 'R&D',
            joiningDate: '2026-09-01',
          },
        };
        const mockForms = [{ id: 'form_123', type: 'PF_FORM11' }];

        jest
          .spyOn(employeeService, 'getEmployee')
          .mockResolvedValue(mockEmployee as any);
        jest
          .spyOn(complianceService, 'getEmployeeForms')
          .mockResolvedValue(mockForms as any);
        jest
          .spyOn(pdfGeneratorService, 'generateFormPDF')
          .mockResolvedValue(Buffer.from('PDF CONTENT'));

        await controller.downloadPdf('emp_123', 'form_123', res, req);

        expect(employeeService.getEmployee).toHaveBeenCalledWith('emp_123');
        expect(complianceService.getEmployeeForms).toHaveBeenCalledWith(
          'emp_123',
        );
        expect(pdfGeneratorService.generateFormPDF).toHaveBeenCalledWith(
          'PF_FORM11',
          {
            name: 'Jane Doe',
            dob: '1990-01-01',
            phone: '555-1234',
            email: 'jane@example.com',
            title: 'Engineer',
            department: 'R&D',
            joiningDate: '2026-09-01',
          },
        );
        expect(res.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          'application/pdf',
        );
        expect(res.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          'attachment; filename=PF_FORM11_emp_123.pdf',
        );
        expect(res.end).toHaveBeenCalledWith(Buffer.from('PDF CONTENT'));
      });
    });
  });
});
