import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditLogService } from '../db/audit-log.service';
import { Roles } from '../auth/roles.decorator';
import { ComplianceService } from '../compliance/compliance.service';
import { EmailService } from '../email/email.service';
import { mapEmployee } from './employee.service';
import { OutboxService } from './outbox.service';
import { RejectHireDto } from './dto/reject-hire.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../interfaces/types.interface';
import {
  assertJobDetails,
  assertPersonalDetails,
} from '../interfaces/types.interface';

@ApiTags('Employee')
@ApiBearerAuth()
@Controller('employees/:employeeId')
export class ManagerReviewController {
  constructor(
    private readonly db: DbService,
    private readonly complianceService: ComplianceService,
    private readonly emailService: EmailService,
    private readonly outboxService: OutboxService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Roles('MANAGER')
  @ApiOperation({ summary: 'Approve an employee hire (Manager review)' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Employee hire approved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or validation failure.',
  })
  @ApiResponse({
    status: 403,
    description: 'Access forbidden / Not the assigned manager.',
  })
  @Post('approve-hire')
  async approveHire(
    @Param('employeeId') employeeId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const employee = await this.db.employee.findUnique({
      where: { id: employeeId },
      include: { documents: true, complianceForms: true, milestones: true },
    });

    if (!employee) {
      throw new ConflictException('Employee not found');
    }

    const job = assertJobDetails(employee.job);
    const managerId = req.user.employeeId || req.user.userId;

    if (job.managerId !== managerId) {
      throw new ForbiddenException(
        'Only the assigned manager can approve this hire',
      );
    }

    if (employee.status !== 'MANAGER_REVIEW') {
      throw new ConflictException(
        `Cannot approve hire. Employee status is ${employee.status}`,
      );
    }

    // Transition: MANAGER_REVIEW -> COMPLIANCE_PROCESSING inside a transaction with OutboxEvent
    const updated = await this.db.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: {
          status: 'COMPLIANCE_PROCESSING',
        },
        include: { documents: true, complianceForms: true, milestones: true },
      });

      await this.auditLogService.createLog(
        {
          employeeId,
          fromStatus: employee.status,
          toStatus: 'COMPLIANCE_PROCESSING',
          actorId: managerId,
          actorRole: 'MANAGER',
          note: 'Manager approved employee documents and details',
        },
        tx,
      );

      const personal = assertPersonalDetails(employee.personal);
      await this.outboxService.createAndEmitEvent(
        tx,
        'employee.status_changed',
        {
          employeeId,
          fromStatus: employee.status,
          toStatus: 'COMPLIANCE_PROCESSING',
          email: personal.email,
          name: personal.name,
        },
      );

      return emp;
    });

    return mapEmployee(updated);
  }

  @Roles('MANAGER')
  @ApiOperation({ summary: 'Reject an employee hire (Manager review)' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Employee hire rejected successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or validation failure.',
  })
  @ApiResponse({
    status: 403,
    description: 'Access forbidden / Not the assigned manager.',
  })
  @Post('reject-hire')
  async rejectHire(
    @Param('employeeId') employeeId: string,
    @Body() dto: RejectHireDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const employee = await this.db.employee.findUnique({
      where: { id: employeeId },
      include: { documents: true, complianceForms: true, milestones: true },
    });

    if (!employee) {
      throw new ConflictException('Employee not found');
    }

    const job = assertJobDetails(employee.job);
    const managerId = req.user.employeeId || req.user.userId;

    if (job.managerId !== managerId) {
      throw new ForbiddenException(
        'Only the assigned manager can reject this hire',
      );
    }

    if (employee.status !== 'MANAGER_REVIEW') {
      throw new ConflictException(
        `Cannot reject hire. Employee status is ${employee.status}`,
      );
    }

    // Transition: MANAGER_REVIEW -> UNDER_REVIEW
    const updated = await this.db.employee.update({
      where: { id: employeeId },
      data: {
        status: 'UNDER_REVIEW',
        lastRejectionReason: dto.reason,
      },
      include: { documents: true, complianceForms: true, milestones: true },
    });

    await this.auditLogService.createLog({
      employeeId,
      fromStatus: employee.status,
      toStatus: 'UNDER_REVIEW',
      actorId: managerId,
      actorRole: 'MANAGER',
      note: `Manager rejected hire. Reason: ${dto.reason}`,
    });

    return mapEmployee(updated);
  }
}
