import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import { ComplianceRuleService } from './compliance-rule.service';
import { OutboxService } from './outbox.service';
import { EmployeeStatusListener } from './employee-status.listener';
import { PdfGeneratorService } from './pdf-generator.service';
import { EmployeeController } from './employee.controller';
import { AuditController } from './audit.controller';
import { ManagerReviewController } from './manager-review.controller';
import { InvitationController } from './invitation.controller';
import { DbService } from '../db/db.service';
import { AuditLogService } from '../db/audit-log.service';
import { EmailService } from '../email/email.service';
import { ComplianceService } from '../compliance/compliance.service';
import { AbacOwnershipGuard } from '../common/guards/abac-ownership.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ExecutionContext,
} from '@nestjs/common';
import { firstValueFrom, take } from 'rxjs';

describe('Employee Module Unit & Integration Tests', () => {
  let employeeService: EmployeeService;
  let complianceRuleService: ComplianceRuleService;
  let outboxService: OutboxService;
  let employeeStatusListener: EmployeeStatusListener;
  let pdfGeneratorService: PdfGeneratorService;
  let employeeController: EmployeeController;
  let auditController: AuditController;
  let abacOwnershipGuard: AbacOwnershipGuard;
  let managerReviewController: ManagerReviewController;
  let invitationController: InvitationController;

  let dbMock: any;
  let auditLogServiceMock: any;
  let emailServiceMock: any;
  let complianceServiceMock: any;
  let eventEmitterMock: any;

  beforeEach(async () => {
    dbMock = {
      employee: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      complianceForm: {
        count: jest.fn(),
        create: jest.fn(),
      },
      user: {
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
        update: jest.fn(),
      },
      complianceRule: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      auditLog: {
        count: jest.fn(),
      },
      invitationCode: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(dbMock)),
    };

    auditLogServiceMock = {
      createLog: jest.fn(),
      verifyChainIntegrityWithCount: jest.fn(),
    };

    emailServiceMock = {
      sendOnboardingInvite: jest.fn(),
      sendHireConfirmation: jest.fn(),
    };

    complianceServiceMock = {
      generateForms: jest.fn(),
    };

    eventEmitterMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        EmployeeController,
        AuditController,
        ManagerReviewController,
        InvitationController,
      ],
      providers: [
        EmployeeService,
        ComplianceRuleService,
        OutboxService,
        EmployeeStatusListener,
        PdfGeneratorService,
        AbacOwnershipGuard,
        { provide: DbService, useValue: dbMock },
        { provide: AuditLogService, useValue: auditLogServiceMock },
        { provide: EmailService, useValue: emailServiceMock },
        { provide: ComplianceService, useValue: complianceServiceMock },
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();

    employeeService = module.get<EmployeeService>(EmployeeService);
    complianceRuleService = module.get<ComplianceRuleService>(
      ComplianceRuleService,
    );
    outboxService = module.get<OutboxService>(OutboxService);
    employeeStatusListener = module.get<EmployeeStatusListener>(
      EmployeeStatusListener,
    );
    pdfGeneratorService = module.get<PdfGeneratorService>(PdfGeneratorService);
    employeeController = module.get<EmployeeController>(EmployeeController);
    auditController = module.get<AuditController>(AuditController);
    abacOwnershipGuard = module.get<AbacOwnershipGuard>(AbacOwnershipGuard);
    managerReviewController = module.get<ManagerReviewController>(
      ManagerReviewController,
    );
    invitationController =
      module.get<InvitationController>(InvitationController);
  });

  describe('EmployeeService', () => {
    describe('generateComplianceForms', () => {
      it('should return early if compliance forms already exist', async () => {
        const empMock = { id: 'emp-123', job: { salary: 25000 } };
        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(empMock);
        jest.spyOn(dbMock.complianceForm, 'count').mockResolvedValue(2);
        const evalSpy = jest.spyOn(
          complianceRuleService,
          'evaluateEligibility',
        );

        await employeeService.generateComplianceForms('emp-123');

        expect(dbMock.complianceForm.count).toHaveBeenCalledWith({
          where: { employeeId: 'emp-123' },
        });
        expect(evalSpy).not.toHaveBeenCalled();
      });

      it('should generate forms according to rule evaluation results', async () => {
        const empMock = { id: 'emp-123', job: { salary: 15000 } };
        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(empMock);
        jest.spyOn(dbMock.complianceForm, 'count').mockResolvedValue(0);
        jest
          .spyOn(complianceRuleService, 'evaluateEligibility')
          .mockResolvedValue({
            pfApplicable: true,
            esiApplicable: true,
            requiredForms: ['PF_FORM11', 'PF_FORM2', 'ESI_FORM1'],
          });

        await employeeService.generateComplianceForms('emp-123');

        expect(dbMock.complianceForm.create).toHaveBeenCalledTimes(3);
      });

      it('should handle and catch P2002 duplicate code error but throw other errors', async () => {
        const empMock = { id: 'emp-123', job: { salary: 15000 } };
        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(empMock);
        jest.spyOn(dbMock.complianceForm, 'count').mockResolvedValue(0);
        jest
          .spyOn(complianceRuleService, 'evaluateEligibility')
          .mockResolvedValue({
            pfApplicable: true,
            esiApplicable: false,
            requiredForms: ['PF_FORM11', 'PF_FORM2'],
          });

        const p2002Error = new Error('Duplicate');
        (p2002Error as any).code = 'P2002';

        const regularError = new Error('Database connection failed');

        jest
          .spyOn(dbMock.complianceForm, 'create')
          .mockRejectedValueOnce(p2002Error)
          .mockRejectedValueOnce(regularError);

        await expect(
          employeeService.generateComplianceForms('emp-123'),
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('listEmployees & getEmployee', () => {
      it('should successfully list all employees mapped to the interface', async () => {
        const prismaEmps = [
          {
            id: 'emp-1',
            status: 'INVITED',
            personal: { name: 'John Doe' },
            job: { title: 'Engineer' },
            documents: [],
            complianceForms: [],
            milestones: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        jest.spyOn(dbMock.employee, 'findMany').mockResolvedValue(prismaEmps);

        const result = await employeeService.listEmployees();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('emp-1');
        expect(result[0].status).toBe('INVITED');
      });

      it('should successfully get a single employee', async () => {
        const prismaEmp = {
          id: 'emp-1',
          status: 'INVITED',
          personal: { name: 'John Doe' },
          job: { title: 'Engineer' },
          documents: [],
          complianceForms: [],
          milestones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(prismaEmp);

        const result = await employeeService.getEmployee('emp-1');
        expect(result.id).toBe('emp-1');
      });

      it('should throw NotFoundException when employee is not found', async () => {
        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(null);

        await expect(
          employeeService.getEmployee('emp-unknown'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('createEmployee', () => {
      it('should create employee in INVITED status, generate temp password, create user, send invite, and audit log', async () => {
        const dto = {
          name: 'Jane Doe',
          dob: '1995-01-01',
          phone: '1234567890',
          email: 'jane@example.com',
          title: 'Software Engineer',
          department: 'Engineering',
          managerId: 'mgr-123',
          salary: 18000,
          joiningDate: '2026-09-01',
        };

        const createdPrismaEmp = {
          id: 'generated-uuid',
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
          documents: [],
          complianceForms: [],
          milestones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest
          .spyOn(dbMock.employee, 'create')
          .mockResolvedValue(createdPrismaEmp);

        const result = await employeeService.createEmployee(dto);

        expect(result.status).toBe('INVITED');
        expect(dbMock.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              email: dto.email,
              role: 'NEW_HIRE',
              employeeId: 'generated-uuid',
              passwordHash: expect.any(String),
            }),
          }),
        );
        expect(emailServiceMock.sendOnboardingInvite).toHaveBeenCalledWith(
          dto.email,
          dto.name,
          expect.any(String),
        );
        expect(auditLogServiceMock.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            employeeId: 'generated-uuid',
            fromStatus: 'INVITED',
            toStatus: 'INVITED',
            actorId: 'mgr-123',
            actorRole: 'HR',
          }),
        );
      });
    });

    describe('openPreboardingLink', () => {
      it('should transition status from INVITED to DOCUMENTS_PENDING and log audit record', async () => {
        const empMock = { id: 'emp-123', status: 'INVITED' };
        const updatedEmpMock = {
          id: 'emp-123',
          status: 'DOCUMENTS_PENDING',
          personal: {},
          job: {},
          documents: [],
          complianceForms: [],
          milestones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(empMock);
        jest.spyOn(dbMock.employee, 'update').mockResolvedValue(updatedEmpMock);

        const result = await employeeService.openPreboardingLink(
          'emp-123',
          'NEW_HIRE',
        );

        expect(result.status).toBe('DOCUMENTS_PENDING');
        expect(dbMock.employee.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'emp-123' },
            data: { status: 'DOCUMENTS_PENDING' },
          }),
        );
        expect(auditLogServiceMock.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            employeeId: 'emp-123',
            fromStatus: 'INVITED',
            toStatus: 'DOCUMENTS_PENDING',
            actorId: 'emp-123',
            actorRole: 'NEW_HIRE',
          }),
        );
      });

      it('should throw ConflictException if preboarding link is already open', async () => {
        const empMock = { id: 'emp-123', status: 'DOCUMENTS_PENDING' };
        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(empMock);

        await expect(
          employeeService.openPreboardingLink('emp-123', 'NEW_HIRE'),
        ).rejects.toThrow(ConflictException);
      });

      it('should throw NotFoundException if employee does not exist', async () => {
        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(null);

        await expect(
          employeeService.openPreboardingLink('emp-unknown', 'NEW_HIRE'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('validateRole', () => {
      it('should allow SYSTEM role for SYSTEM allowed action', () => {
        expect(() =>
          employeeService.validateRole('SYSTEM', ['SYSTEM']),
        ).not.toThrow();
      });

      it('should allow HR role for HR allowed action', () => {
        expect(() => employeeService.validateRole('HR', ['HR'])).not.toThrow();
      });

      it('should allow MANAGER role for MANAGER allowed action', () => {
        expect(() =>
          employeeService.validateRole('MANAGER', ['MANAGER']),
        ).not.toThrow();
      });

      it('should allow NEW_HIRE role matching their own employeeId', () => {
        expect(() =>
          employeeService.validateRole(
            'NEW_HIRE',
            ['NEW_HIRE'],
            'emp-123',
            'emp-123',
          ),
        ).not.toThrow();
      });

      it('should throw ForbiddenException if NEW_HIRE attempts action for someone else', () => {
        expect(() =>
          employeeService.validateRole(
            'NEW_HIRE',
            ['NEW_HIRE'],
            'emp-123',
            'emp-456',
          ),
        ).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for unauthorized roles', () => {
        expect(() => employeeService.validateRole('NEW_HIRE', ['HR'])).toThrow(
          ForbiddenException,
        );
      });
    });
  });

  describe('EmployeeStatusListener', () => {
    it('should push event to SSE stream, auto-generate compliance forms, send hire email, and update processed status', async () => {
      const event = {
        id: 'evt-123',
        eventType: 'employee.status_changed',
        payload: {
          employeeId: 'emp-123',
          toStatus: 'COMPLIANCE_PROCESSING',
          email: 'test@example.com',
          name: 'Test Candidate',
        },
      };

      const ssePromise = firstValueFrom(
        EmployeeStatusListener.statusChange$.pipe(take(1)),
      );

      await employeeStatusListener.handleEmployeeStatusChanged(event);

      const sseEvent = await ssePromise;
      expect(sseEvent).toEqual({
        employeeId: 'emp-123',
        newStatus: 'COMPLIANCE_PROCESSING',
        timestamp: expect.any(String),
      });

      expect(complianceServiceMock.generateForms).toHaveBeenCalledWith(
        'emp-123',
      );
      expect(emailServiceMock.sendHireConfirmation).toHaveBeenCalledWith(
        'test@example.com',
        'Test Candidate',
      );
      expect(dbMock.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt-123' },
        data: { processed: true },
      });
    });

    it('should catch errors and not crash if form generation fails', async () => {
      const event = {
        id: 'evt-123',
        eventType: 'employee.status_changed',
        payload: {
          employeeId: 'emp-123',
          toStatus: 'COMPLIANCE_PROCESSING',
          email: 'test@example.com',
          name: 'Test Candidate',
        },
      };

      complianceServiceMock.generateForms.mockRejectedValue(
        new Error('Form gen failed'),
      );

      await expect(
        employeeStatusListener.handleEmployeeStatusChanged(event),
      ).resolves.not.toThrow();
    });
  });

  describe('OutboxService', () => {
    describe('createAndEmitEvent', () => {
      it('should persist event via tx client and emit to EventEmitter2', async () => {
        const txMock: any = {
          outboxEvent: {
            create: jest.fn().mockResolvedValue({
              id: 'out-123',
              eventType: 'test.event',
              payload: { a: 1 },
            }),
          },
        };

        const result = await outboxService.createAndEmitEvent(
          txMock,
          'test.event',
          { a: 1 },
        );

        expect(txMock.outboxEvent.create).toHaveBeenCalledWith({
          data: {
            eventType: 'test.event',
            payload: { a: 1 },
          },
        });
        expect(eventEmitterMock.emit).toHaveBeenCalledWith(
          'test.event',
          result,
        );
        expect(result.id).toBe('out-123');
      });
    });
  });

  describe('ComplianceRuleService', () => {
    describe('seedDefaultRules', () => {
      it('should seed default rules during onModuleInit', async () => {
        await complianceRuleService.onModuleInit();
        expect(dbMock.complianceRule.upsert).toHaveBeenCalledTimes(2);
      });
    });

    describe('getThreshold', () => {
      it('should return threshold from db if active rule exists', async () => {
        jest.spyOn(dbMock.complianceRule, 'findUnique').mockResolvedValue({
          ruleKey: 'ESI_GROSS_LIMIT',
          threshold: 21000,
          isActive: true,
        });

        const threshold = await complianceRuleService.getThreshold(
          'ESI_GROSS_LIMIT',
          10000,
        );
        expect(threshold).toBe(21000);
      });

      it('should return fallback if rule does not exist or is inactive', async () => {
        jest.spyOn(dbMock.complianceRule, 'findUnique').mockResolvedValue(null);

        const threshold = await complianceRuleService.getThreshold(
          'ESI_GROSS_LIMIT',
          10000,
        );
        expect(threshold).toBe(10000);
      });
    });

    describe('evaluateEligibility', () => {
      it('should return pfApplicable true and esiApplicable based on gross salary limit', async () => {
        jest.spyOn(dbMock.complianceRule, 'findUnique').mockResolvedValue({
          ruleKey: 'ESI_GROSS_LIMIT',
          threshold: 21000,
          isActive: true,
        });

        const eligibilityUnder =
          await complianceRuleService.evaluateEligibility(20000);
        expect(eligibilityUnder.pfApplicable).toBe(true);
        expect(eligibilityUnder.esiApplicable).toBe(true);
        expect(eligibilityUnder.requiredForms).toContain('ESI_FORM1');

        const eligibilityOver =
          await complianceRuleService.evaluateEligibility(25000);
        expect(eligibilityOver.pfApplicable).toBe(true);
        expect(eligibilityOver.esiApplicable).toBe(false);
        expect(eligibilityOver.requiredForms).not.toContain('ESI_FORM1');
      });
    });
  });

  describe('PdfGeneratorService', () => {
    describe('generateFormPDF', () => {
      it('should successfully return a PDF Buffer filled with candidate details', async () => {
        const candidate = {
          name: 'John Doe',
          dob: '1990-05-15',
          phone: '9999999999',
          email: 'john@example.com',
          title: 'Architect',
          department: 'Engineering',
          joiningDate: '2026-10-10',
        };

        const pdfBuffer = await pdfGeneratorService.generateFormPDF(
          'PF_FORM11',
          candidate,
        );

        expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
        expect(pdfBuffer.length).toBeGreaterThan(0);
      });
    });
  });

  describe('EmployeeController', () => {
    it('findAll should call listEmployees', async () => {
      const listSpy = jest
        .spyOn(employeeService, 'listEmployees')
        .mockResolvedValue([]);
      await employeeController.findAll();
      expect(listSpy).toHaveBeenCalled();
    });

    it('create should call createEmployee', async () => {
      const dto: any = { name: 'Test' };
      const createSpy = jest
        .spyOn(employeeService, 'createEmployee')
        .mockResolvedValue({} as any);
      await employeeController.create(dto);
      expect(createSpy).toHaveBeenCalledWith(dto);
    });

    it('findOne should call getEmployee', async () => {
      const findSpy = jest
        .spyOn(employeeService, 'getEmployee')
        .mockResolvedValue({} as any);
      await employeeController.findOne('emp-123');
      expect(findSpy).toHaveBeenCalledWith('emp-123');
    });

    it('openPreboarding should call openPreboardingLink', async () => {
      const openSpy = jest
        .spyOn(employeeService, 'openPreboardingLink')
        .mockResolvedValue({} as any);
      const req: any = { user: { role: 'NEW_HIRE' } };
      await employeeController.openPreboarding('emp-123', req);
      expect(openSpy).toHaveBeenCalledWith('emp-123', 'NEW_HIRE');
    });

    it('liveStatus should pipe status change events', (done) => {
      employeeController
        .liveStatus()
        .pipe(take(1))
        .subscribe((val) => {
          expect(val.data.employeeId).toBe('emp-123');
          done();
        });

      EmployeeStatusListener.statusChange$.next({
        employeeId: 'emp-123',
        newStatus: 'COMPLIANCE_PROCESSING',
        timestamp: '2026-08-08',
      });
    });
  });

  describe('AuditController', () => {
    it('verifyIntegrity should call verifyChainIntegrityWithCount', async () => {
      const verifySpy = jest
        .spyOn(auditLogServiceMock, 'verifyChainIntegrityWithCount')
        .mockResolvedValue({
          success: true,
          totalLogsVerified: 5,
        });

      const result = await auditController.verifyIntegrity();
      expect(verifySpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('AbacOwnershipGuard', () => {
    it('should throw ForbiddenException if user is not logged in', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as ExecutionContext;

      await expect(abacOwnershipGuard.canActivate(context)).rejects.toThrow(
        'No user session found',
      );
    });

    it('should allow access if role is HR', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: 'HR', employeeId: 'hr-1' },
            params: { id: 'emp-123' },
          }),
        }),
      } as any;

      const allowed = await abacOwnershipGuard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it('should allow access if role is NEW_HIRE and targeting self', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: 'NEW_HIRE', employeeId: 'emp-123' },
            params: { id: 'emp-123' },
          }),
        }),
      } as any;

      const allowed = await abacOwnershipGuard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it('should block access if role is NEW_HIRE and targeting someone else', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: 'NEW_HIRE', employeeId: 'emp-123' },
            params: { id: 'emp-456' },
          }),
        }),
      } as any;

      await expect(abacOwnershipGuard.canActivate(context)).rejects.toThrow(
        'Access denied: You can only access your own record.',
      );
    });

    it('should allow access if role is MANAGER and targeting managed employee', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: 'MANAGER', employeeId: 'mgr-1' },
            params: { id: 'emp-123' },
          }),
        }),
      } as any;

      jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue({
        id: 'emp-123',
        job: { managerId: 'mgr-1' },
      });

      const allowed = await abacOwnershipGuard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it('should block access if role is MANAGER and targeting non-managed employee', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: 'MANAGER', employeeId: 'mgr-1' },
            params: { id: 'emp-123' },
          }),
        }),
      } as any;

      jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue({
        id: 'emp-123',
        job: { managerId: 'mgr-2' },
      });

      await expect(abacOwnershipGuard.canActivate(context)).rejects.toThrow(
        'Access denied: You are not the assigned manager for this employee.',
      );
    });
  });

  describe('ManagerReviewController', () => {
    describe('approveHire', () => {
      it('should successfully approve hire, transition to COMPLIANCE_PROCESSING, log audit, and create outbox event', async () => {
        const employeeMock = {
          id: 'emp-123',
          status: 'MANAGER_REVIEW',
          personal: { email: 'jane@example.com', name: 'Jane Doe' },
          job: { managerId: 'mgr-123' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };
        const updatedEmployeeMock = {
          ...employeeMock,
          status: 'COMPLIANCE_PROCESSING',
        };

        jest
          .spyOn(dbMock.employee, 'findUnique')
          .mockResolvedValue(employeeMock);
        jest
          .spyOn(dbMock.employee, 'update')
          .mockResolvedValue(updatedEmployeeMock);

        const req = { user: { employeeId: 'mgr-123' } } as any;
        const result = await managerReviewController.approveHire(
          'emp-123',
          req,
        );

        expect(result.status).toBe('COMPLIANCE_PROCESSING');
        expect(dbMock.employee.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'emp-123' },
            data: { status: 'COMPLIANCE_PROCESSING' },
          }),
        );
        expect(auditLogServiceMock.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            employeeId: 'emp-123',
            fromStatus: 'MANAGER_REVIEW',
            toStatus: 'COMPLIANCE_PROCESSING',
            actorId: 'mgr-123',
            actorRole: 'MANAGER',
          }),
          expect.anything(),
        );
        expect(dbMock.outboxEvent.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              eventType: 'employee.status_changed',
              payload: expect.objectContaining({
                employeeId: 'emp-123',
                toStatus: 'COMPLIANCE_PROCESSING',
                email: 'jane@example.com',
                name: 'Jane Doe',
              }),
            }),
          }),
        );
      });

      it('should throw ConflictException if employee is not found', async () => {
        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(null);
        const req = { user: { employeeId: 'mgr-123' } } as any;

        await expect(
          managerReviewController.approveHire('emp-123', req),
        ).rejects.toThrow(new ConflictException('Employee not found'));
      });

      it('should throw ForbiddenException if user is not the assigned manager', async () => {
        const employeeMock = {
          id: 'emp-123',
          status: 'MANAGER_REVIEW',
          personal: { email: 'jane@example.com', name: 'Jane Doe' },
          job: { managerId: 'mgr-999' },
        };
        jest
          .spyOn(dbMock.employee, 'findUnique')
          .mockResolvedValue(employeeMock);
        const req = { user: { employeeId: 'mgr-123' } } as any;

        await expect(
          managerReviewController.approveHire('emp-123', req),
        ).rejects.toThrow(
          new ForbiddenException(
            'Only the assigned manager can approve this hire',
          ),
        );
      });

      it('should throw ConflictException if state transition is invalid', async () => {
        const employeeMock = {
          id: 'emp-123',
          status: 'INVITED',
          personal: { email: 'jane@example.com', name: 'Jane Doe' },
          job: { managerId: 'mgr-123' },
        };
        jest
          .spyOn(dbMock.employee, 'findUnique')
          .mockResolvedValue(employeeMock);
        const req = { user: { employeeId: 'mgr-123' } } as any;

        await expect(
          managerReviewController.approveHire('emp-123', req),
        ).rejects.toThrow(
          new ConflictException(
            'Cannot approve hire. Employee status is INVITED',
          ),
        );
      });
    });

    describe('rejectHire', () => {
      it('should successfully reject hire, transition to UNDER_REVIEW, and log audit', async () => {
        const employeeMock = {
          id: 'emp-123',
          status: 'MANAGER_REVIEW',
          personal: { email: 'jane@example.com', name: 'Jane Doe' },
          job: { managerId: 'mgr-123' },
          documents: [],
          complianceForms: [],
          milestones: [],
        };
        const updatedEmployeeMock = {
          ...employeeMock,
          status: 'UNDER_REVIEW',
          lastRejectionReason: 'Invalid docs',
        };

        jest
          .spyOn(dbMock.employee, 'findUnique')
          .mockResolvedValue(employeeMock);
        jest
          .spyOn(dbMock.employee, 'update')
          .mockResolvedValue(updatedEmployeeMock);

        const req = { user: { employeeId: 'mgr-123' } } as any;
        const result = await managerReviewController.rejectHire(
          'emp-123',
          { reason: 'Invalid docs' },
          req,
        );

        expect(result.status).toBe('UNDER_REVIEW');
        expect(dbMock.employee.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'emp-123' },
            data: {
              status: 'UNDER_REVIEW',
              lastRejectionReason: 'Invalid docs',
            },
          }),
        );
        expect(auditLogServiceMock.createLog).toHaveBeenCalledWith(
          expect.objectContaining({
            employeeId: 'emp-123',
            fromStatus: 'MANAGER_REVIEW',
            toStatus: 'UNDER_REVIEW',
            actorId: 'mgr-123',
            actorRole: 'MANAGER',
            note: 'Manager rejected hire. Reason: Invalid docs',
          }),
        );
      });

      it('should throw ConflictException if employee is not found', async () => {
        jest.spyOn(dbMock.employee, 'findUnique').mockResolvedValue(null);
        const req = { user: { employeeId: 'mgr-123' } } as any;

        await expect(
          managerReviewController.rejectHire(
            'emp-123',
            { reason: 'Invalid docs' },
            req,
          ),
        ).rejects.toThrow(new ConflictException('Employee not found'));
      });

      it('should throw ForbiddenException if user is not the assigned manager', async () => {
        const employeeMock = {
          id: 'emp-123',
          status: 'MANAGER_REVIEW',
          personal: { email: 'jane@example.com', name: 'Jane Doe' },
          job: { managerId: 'mgr-999' },
        };
        jest
          .spyOn(dbMock.employee, 'findUnique')
          .mockResolvedValue(employeeMock);
        const req = { user: { employeeId: 'mgr-123' } } as any;

        await expect(
          managerReviewController.rejectHire(
            'emp-123',
            { reason: 'Invalid docs' },
            req,
          ),
        ).rejects.toThrow(
          new ForbiddenException(
            'Only the assigned manager can reject this hire',
          ),
        );
      });

      it('should throw ConflictException if state transition is invalid', async () => {
        const employeeMock = {
          id: 'emp-123',
          status: 'INVITED',
          personal: { email: 'jane@example.com', name: 'Jane Doe' },
          job: { managerId: 'mgr-123' },
        };
        jest
          .spyOn(dbMock.employee, 'findUnique')
          .mockResolvedValue(employeeMock);
        const req = { user: { employeeId: 'mgr-123' } } as any;

        await expect(
          managerReviewController.rejectHire(
            'emp-123',
            { reason: 'Invalid docs' },
            req,
          ),
        ).rejects.toThrow(
          new ConflictException(
            'Cannot reject hire. Employee status is INVITED',
          ),
        );
      });
    });
  });

  describe('InvitationController', () => {
    it('listInvitations should return all invitation codes ordered by createdAt desc', async () => {
      const mockInvitations = [
        { code: 'ABCDEFGH', jobTitle: 'Engineer', createdAt: new Date() },
      ];
      jest
        .spyOn(dbMock.invitationCode, 'findMany')
        .mockResolvedValue(mockInvitations);

      const result = await invitationController.listInvitations();
      expect(dbMock.invitationCode.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockInvitations);
    });

    it('createInvitation should generate an 8-character code and create db record', async () => {
      const dto = {
        jobTitle: 'Developer',
        department: 'IT',
        managerId: 'mgr-123',
        salary: 50000,
        joiningDate: '2026-09-01',
      };
      const mockCreated = {
        code: 'A1B2C3D4',
        ...dto,
        joiningDate: new Date(dto.joiningDate),
      };
      jest
        .spyOn(dbMock.invitationCode, 'create')
        .mockResolvedValue(mockCreated);

      const result = await invitationController.createInvitation(dto);
      expect(dbMock.invitationCode.create).toHaveBeenCalledWith({
        data: {
          code: expect.any(String),
          jobTitle: dto.jobTitle,
          department: dto.department,
          managerId: dto.managerId,
          salary: dto.salary,
          joiningDate: new Date(dto.joiningDate),
        },
      });
      expect(result).toEqual({ code: 'A1B2C3D4' });
    });
  });
});
