import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { DbService } from '../db/db.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';

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
