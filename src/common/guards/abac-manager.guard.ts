import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DbService } from '../../db/db.service';

@Injectable()
export class AbacManagerGuard implements CanActivate {
  constructor(private readonly db: DbService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) {
      throw new ForbiddenException('No user session found');
    }

    const employeeId = request.params.id || request.params.employeeId;

    if (user.role === 'NEW_HIRE') {
      if (employeeId && user.employeeId !== employeeId) {
        throw new ForbiddenException('Access denied: You can only access your own record.');
      }
    }

    if (user.role === 'MANAGER') {
      if (employeeId) {
        const employee = await this.db.employee.findUnique({
          where: { id: employeeId },
        });
        if (employee) {
          const job = employee.job as any;
          const managerId = user.employeeId || user.userId;
          if (job?.managerId !== managerId) {
            throw new ForbiddenException('Access denied: You are not the assigned manager for this employee.');
          }
        }
      }
    }

    return true;
  }
}
