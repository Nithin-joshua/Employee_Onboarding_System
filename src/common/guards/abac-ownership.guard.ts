import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { DbService } from '../../db/db.service';
import {
  AuthenticatedRequest,
  assertJobDetails,
} from '../../interfaces/types.interface';

@Injectable()
export class AbacOwnershipGuard implements CanActivate {
  constructor(private readonly db: DbService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
