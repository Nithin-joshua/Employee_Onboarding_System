import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { DbService } from '../db/db.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { AuditLogService } from '../db/audit-log.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('Auth Guards & Strategy Unit Tests', () => {
  describe('JwtStrategy', () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
      strategy = new JwtStrategy();
    });

    it('validate should unpack payload and return fields', async () => {
      const payload = { sub: 'user_123', role: 'HR', employeeId: 'emp_123' };
      const result = await strategy.validate(payload);
      expect(result).toEqual({
        userId: 'user_123',
        role: 'HR',
        employeeId: 'emp_123',
      });
    });
  });

  describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;
    let reflector: Reflector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
        ],
      }).compile();

      guard = module.get<JwtAuthGuard>(JwtAuthGuard);
      reflector = module.get<Reflector>(Reflector);
    });

    it('should return true if route is decorated as public', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(context);
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: Reflector;
    let db: DbService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RolesGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
          {
            provide: DbService,
            useValue: {
              employee: {
                findUnique: jest.fn(),
              },
            },
          },
        ],
      }).compile();

      guard = module.get<RolesGuard>(RolesGuard);
      reflector = module.get<Reflector>(Reflector);
      db = module.get<DbService>(DbService);
    });

    it('should return true if no roles required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user is missing', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['HR']);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: null,
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user has incorrect role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['HR']);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: 'NEW_HIRE' },
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should block NEW_HIRE if attempting to access another record', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['NEW_HIRE']);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            params: { id: 'other_id' },
            user: { role: 'NEW_HIRE', employeeId: 'my_id' },
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow NEW_HIRE if accessing their own record', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['NEW_HIRE']);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            params: { id: 'my_id' },
            user: { role: 'NEW_HIRE', employeeId: 'my_id' },
          }),
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should block MANAGER if employee manager does not match', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MANAGER']);
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        job: { managerId: 'mgr_other' },
      } as any);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            params: { id: 'emp_123' },
            user: { role: 'MANAGER', employeeId: 'mgr_me' },
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow MANAGER if employee manager matches', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MANAGER']);
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        job: { managerId: 'mgr_me' },
      } as any);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            params: { id: 'emp_123' },
            user: { role: 'MANAGER', employeeId: 'mgr_me' },
          }),
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});

describe('AuthService and AuthController unit tests', () => {
  let authService: AuthService;
  let authController: AuthController;
  let dbService: any;
  let jwtService: any;
  let emailService: any;
  let auditLogService: any;

  const mockTx = {
    invitationCode: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      create: jest.fn(),
    },
    employee: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    otpCode: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockDbService = {
    user: {
      findUnique: jest.fn(),
    },
    otpCode: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockEmailService = {
    sendOtp: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditLogService = {
    createLog: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: DbService, useValue: mockDbService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    authController = module.get<AuthController>(AuthController);
    dbService = module.get<DbService>(DbService);
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
    auditLogService = module.get<AuditLogService>(AuditLogService);

    jest.clearAllMocks();
  });

  describe('registerCandidate', () => {
    const dto = {
      invitationCode: 'INV-1234',
      email: 'newhire@company.com',
      pass: 'securePassword123',
      name: 'John Doe',
      dob: '1995-05-15',
      phone: '+1234567890',
    };

    it('should register candidate successfully and send OTP', async () => {
      mockDbService.user.findUnique.mockResolvedValue(null);
      mockTx.invitationCode.findUnique.mockResolvedValue({
        id: 'code-1',
        code: 'INV-1234',
        used: false,
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        managerId: 'mgr-999',
        salary: 80000,
        joiningDate: new Date(),
      });
      mockTx.invitationCode.update.mockResolvedValue({});
      mockTx.user.create.mockResolvedValue({
        id: 'user-777',
        email: dto.email,
      });
      mockTx.employee.create.mockResolvedValue({});
      mockTx.otpCode.create.mockResolvedValue({});

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await authService.registerCandidate(dto);

      expect(result).toEqual({
        email: dto.email,
        message: 'OTP sent to your email address',
      });
      expect(mockDbService.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(mockTx.invitationCode.findUnique).toHaveBeenCalledWith({
        where: { code: dto.invitationCode },
      });
      expect(mockTx.invitationCode.update).toHaveBeenCalled();
      expect(mockTx.user.create).toHaveBeenCalled();
      expect(mockTx.employee.create).toHaveBeenCalled();
      expect(mockAuditLogService.createLog).toHaveBeenCalled();
      expect(mockTx.otpCode.create).toHaveBeenCalled();
      expect(mockEmailService.sendOtp).toHaveBeenCalledWith(
        dto.email,
        expect.any(String),
      );
    });

    it('should rollback transaction if employee creation throws database error', async () => {
      mockDbService.user.findUnique.mockResolvedValue(null);
      mockTx.invitationCode.findUnique.mockResolvedValue({
        id: 'code-1',
        code: 'INV-1234',
        used: false,
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        managerId: 'mgr-999',
        salary: 80000,
        joiningDate: new Date(),
      });
      mockTx.invitationCode.update.mockResolvedValue({});
      mockTx.user.create.mockResolvedValue({
        id: 'user-777',
        email: dto.email,
      });

      const dbError = new Error('Database connection failed');
      mockTx.employee.create.mockRejectedValue(dbError);

      await expect(authService.registerCandidate(dto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockEmailService.sendOtp).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockDbService.user.findUnique.mockResolvedValue({ id: 'user-exist' });

      await expect(authService.registerCandidate(dto)).rejects.toThrow(
        new ConflictException('Email already registered'),
      );
    });

    it('should throw ConflictException if invite code is invalid or used', async () => {
      mockDbService.user.findUnique.mockResolvedValue(null);
      mockTx.invitationCode.findUnique.mockResolvedValue(null); // Invalid code

      await expect(authService.registerCandidate(dto)).rejects.toThrow(
        new ConflictException('Invalid or already used invitation code'),
      );
    });
  });

  describe('verifyOtp', () => {
    const email = 'candidate@company.com';
    const otp = '123456';
    const validExpiry = new Date(Date.now() + 50000);

    it('should successfully verify OTP and transition status REGISTERED -> DOCUMENTS_PENDING', async () => {
      mockDbService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email,
        employeeId: 'emp-1',
        role: 'NEW_HIRE',
      });
      mockDbService.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: otp,
        expiresAt: validExpiry,
      });
      mockTx.otpCode.update.mockResolvedValue({});
      mockTx.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        status: 'REGISTERED',
      });
      mockTx.employee.update.mockResolvedValue({});

      const result = await authService.verifyOtp(email, otp);

      expect(result).toEqual({ access_token: 'mock-jwt-token' });
      expect(mockTx.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { verified: true },
      });
      expect(mockTx.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: { status: 'DOCUMENTS_PENDING' },
      });
      expect(mockAuditLogService.createLog).toHaveBeenCalledWith(
        {
          employeeId: 'emp-1',
          fromStatus: 'REGISTERED',
          toStatus: 'DOCUMENTS_PENDING',
          actorId: 'user-1',
          actorRole: 'NEW_HIRE',
          note: 'OTP verified, candidate preboarding active',
        },
        mockTx,
      );
    });

    it('should throw ConflictException if user is not found', async () => {
      mockDbService.user.findUnique.mockResolvedValue(null);

      await expect(authService.verifyOtp(email, otp)).rejects.toThrow(
        new ConflictException('User not found'),
      );
    });

    it('should throw ConflictException if OTP is invalid or expired', async () => {
      mockDbService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockDbService.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: 'wrong-otp',
        expiresAt: validExpiry,
      });

      await expect(authService.verifyOtp(email, otp)).rejects.toThrow(
        new ConflictException('Invalid or expired OTP code'),
      );
    });

    it('should verify OTP but skip transition if employee status is not REGISTERED', async () => {
      mockDbService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email,
        employeeId: 'emp-1',
        role: 'NEW_HIRE',
      });
      mockDbService.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: otp,
        expiresAt: validExpiry,
      });
      mockTx.otpCode.update.mockResolvedValue({});
      mockTx.employee.findUnique.mockResolvedValue({
        id: 'emp-1',
        status: 'DOCUMENTS_PENDING', // already transitioned or different status
      });

      const result = await authService.verifyOtp(email, otp);

      expect(result).toEqual({ access_token: 'mock-jwt-token' });
      expect(mockTx.employee.update).not.toHaveBeenCalled();
      expect(mockAuditLogService.createLog).not.toHaveBeenCalled();
    });
  });

  describe('resendOtp', () => {
    const email = 'resend@company.com';

    it('should delete previous OTP codes and send a new OTP', async () => {
      mockDbService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockDbService.otpCode.deleteMany.mockResolvedValue({});
      mockDbService.otpCode.create.mockResolvedValue({});

      const result = await authService.resendOtp(email);

      expect(result).toEqual({
        message: 'New OTP code sent to your email address',
      });
      expect(mockDbService.otpCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockDbService.otpCode.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          code: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
      expect(mockEmailService.sendOtp).toHaveBeenCalledWith(
        email,
        expect.any(String),
      );
    });

    it('should throw ConflictException on resend OTP if user does not exist', async () => {
      mockDbService.user.findUnique.mockResolvedValue(null);

      await expect(authService.resendOtp(email)).rejects.toThrow(
        new ConflictException('User not found'),
      );
    });
  });

  describe('login', () => {
    const email = 'login@company.com';
    const pass = 'password';

    it('should issue a token upon successful login', async () => {
      mockDbService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email,
        passwordHash: 'hashed-password',
        role: 'HR',
        employeeId: 'emp-hr',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(email, pass);

      expect(result).toEqual({ access_token: 'mock-jwt-token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        role: 'HR',
        employeeId: 'emp-hr',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockDbService.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(email, pass)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password matches wrong hash', async () => {
      mockDbService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(email, pass)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('AuthController mappings', () => {
    it('should map login request to authService.login', async () => {
      const loginSpy = jest
        .spyOn(authService, 'login')
        .mockResolvedValue({ access_token: 'token' });
      const body = { email: 'test@test.com', pass: 'pass' };

      const result = await authController.login(body);
      expect(result).toEqual({ access_token: 'token' });
      expect(loginSpy).toHaveBeenCalledWith(body.email, body.pass);
    });

    it('should map register request to authService.registerCandidate', async () => {
      const registerSpy = jest
        .spyOn(authService, 'registerCandidate')
        .mockResolvedValue({ email: 'test@test.com', message: 'sent' });
      const body = {
        invitationCode: 'INV-1',
        email: 'test@test.com',
        pass: 'pass',
        name: 'Name',
        dob: '1990-01-01',
        phone: '1234',
      };

      const result = await authController.registerCandidate(body);
      expect(result).toEqual({ email: 'test@test.com', message: 'sent' });
      expect(registerSpy).toHaveBeenCalledWith(body);
    });

    it('should map verify-otp request to authService.verifyOtp', async () => {
      const verifySpy = jest
        .spyOn(authService, 'verifyOtp')
        .mockResolvedValue({ access_token: 'token' });
      const body = { email: 'test@test.com', otp: '123456' };

      const result = await authController.verifyOtp(body);
      expect(result).toEqual({ access_token: 'token' });
      expect(verifySpy).toHaveBeenCalledWith(body.email, body.otp);
    });

    it('should map resend-otp request to authService.resendOtp', async () => {
      const resendSpy = jest
        .spyOn(authService, 'resendOtp')
        .mockResolvedValue({ message: 'sent' });
      const body = { email: 'test@test.com' };

      const result = await authController.resendOtp(body);
      expect(result).toEqual({ message: 'sent' });
      expect(resendSpy).toHaveBeenCalledWith(body.email);
    });
  });
});
