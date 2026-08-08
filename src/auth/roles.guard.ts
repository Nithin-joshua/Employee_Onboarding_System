import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { DbService } from '../db/db.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private db: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user || !user.role) {
      throw new ForbiddenException('No user role found in request context');
    }

    // Check if user has permission
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Role ${user.role} is not authorized for this action`,
      );
    }

    const employeeId = request.params.employeeId || request.params.id;

    // ABAC Guard: If user is a NEW_HIRE, check ownership
    if (user.role === 'NEW_HIRE') {
      if (employeeId && user.employeeId !== employeeId) {
        throw new ForbiddenException(
          'Access denied: You can only access your own record.',
        );
      }
    }

    // ABAC Guard: If user is a MANAGER, enforce manager ownership on employee records
    if (user.role === 'MANAGER') {
      if (employeeId) {
        const employee = await this.db.employee.findUnique({
          where: { id: employeeId },
        });
        if (employee) {
          const job = employee.job as any;
          const managerId = user.employeeId || user.userId;
          if (job?.managerId !== managerId) {
            throw new ForbiddenException(
              'Only the assigned manager can perform actions on this employee record',
            );
          }
        }
      }
    }

    return true;
  }
}
