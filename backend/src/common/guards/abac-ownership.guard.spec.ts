import { Test, TestingModule } from '@nestjs/testing';
import { AbacOwnershipGuard } from './abac-ownership.guard';
import { DbService } from '../../db/db.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('AbacOwnershipGuard Unit Tests', () => {
  let guard: AbacOwnershipGuard;
  let db: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbacOwnershipGuard,
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

    guard = module.get<AbacOwnershipGuard>(AbacOwnershipGuard);
    db = module.get<DbService>(DbService);
  });

  it('should throw ForbiddenException if user session is missing', async () => {
    const context = {
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

  it('should allow NEW_HIRE if accessing their own record', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { id: 'emp_123' },
          user: { role: 'NEW_HIRE', employeeId: 'emp_123' },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should block NEW_HIRE if accessing another record', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { id: 'emp_other' },
          user: { role: 'NEW_HIRE', employeeId: 'emp_123' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should block MANAGER if not assigned to the employee', async () => {
    jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
      id: 'emp_123',
      job: { managerId: 'mgr_other' },
    } as any);

    const context = {
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

  it('should allow MANAGER if assigned to the employee', async () => {
    jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
      id: 'emp_123',
      job: { managerId: 'mgr_me' },
    } as any);

    const context = {
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

  it('should allow HR role unconditionally', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { id: 'emp_123' },
          user: { role: 'HR' },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
