import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DbService } from '../../db/db.service';
import { IS_PUBLIC_KEY } from '../../auth/public.decorator';
import {
  AuthenticatedRequest,
  assertJobDetails,
} from '../../interfaces/types.interface';

@Injectable()
export class AbacOwnershipGuard implements CanActivate {
  constructor(
    private readonly db: DbService,
    private readonly reflector?: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector && typeof context.getHandler === 'function') {
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass?.() || ({} as any)],
      );
      if (isPublic) {
        return true;
      }
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;
    if (!user) {
      throw new ForbiddenException('No user session found');
    }

    let employeeId = request.params.id || request.params.employeeId;
    if (Array.isArray(employeeId)) {
      employeeId = employeeId[0];
    }

    if (user.role === 'NEW_HIRE') {
      if (employeeId && user.employeeId !== employeeId) {
        throw new ForbiddenException(
          'Access denied: You can only access your own record.',
        );
      }
    }

    if (user.role === 'MANAGER') {
      if (employeeId) {
        const employee = await this.db.employee.findUnique({
          where: { id: employeeId },
        });
        if (employee) {
          const job = assertJobDetails(employee.job);
          const managerId = user.employeeId || user.userId;
          if (job.managerId !== managerId) {
            throw new ForbiddenException(
              'Access denied: You are not the assigned manager for this employee.',
            );
          }
        }
      }
    }

    return true;
  }
}
