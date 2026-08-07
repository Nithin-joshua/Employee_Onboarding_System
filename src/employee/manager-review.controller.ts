import { Controller, Post, Body, Param, Req, ForbiddenException, ConflictException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Roles } from '../auth/roles.decorator';
import { ComplianceService } from '../compliance/compliance.service';
import { EmailService } from '../email/email.service';
import { mapEmployee } from './employee.service';

@Controller('employees/:employeeId')
export class ManagerReviewController {
  constructor(
    private readonly db: DbService,
    private readonly complianceService: ComplianceService,
    private readonly emailService: EmailService,
  ) {}

  @Roles('MANAGER')
  @Post('approve-hire')
  async approveHire(@Param('employeeId') employeeId: string, @Req() req: any) {
    const employee = await this.db.employee.findUnique({
      where: { id: employeeId },
      include: { documents: true, complianceForms: true, milestones: true },
    });

    if (!employee) {
      throw new ConflictException('Employee not found');
    }

    const job = employee.job as any;
    const managerId = req.user.employeeId || req.user.userId;

    if (job.managerId !== managerId) {
      throw new ForbiddenException('Only the assigned manager can approve this hire');
    }

    if (employee.status !== 'MANAGER_REVIEW') {
      throw new ConflictException(`Cannot approve hire. Employee status is ${employee.status}`);
    }

    // Transition: MANAGER_REVIEW -> COMPLIANCE_PROCESSING
    const updated = await this.db.employee.update({
      where: { id: employeeId },
      data: {
        status: 'COMPLIANCE_PROCESSING',
      },
      include: { documents: true, complianceForms: true, milestones: true },
    });

    await this.db.auditLog.create({
      data: {
        employeeId,
        fromStatus: employee.status,
        toStatus: 'COMPLIANCE_PROCESSING',
        actorId: managerId,
        actorRole: 'MANAGER',
        note: 'Manager approved employee documents and details',
      },
    });

    // Auto-generate compliance forms
    await this.complianceService.generateForms(employeeId);

    // Send hire-confirmation email via Brevo EmailService
    const personal = employee.personal as any;
    await this.emailService.sendHireConfirmation(personal.email, personal.name);

    return mapEmployee(updated);
  }

  @Roles('MANAGER')
  @Post('reject-hire')
  async rejectHire(
    @Param('employeeId') employeeId: string,
    @Body() dto: { reason: string },
    @Req() req: any,
  ) {
    const employee = await this.db.employee.findUnique({
      where: { id: employeeId },
      include: { documents: true, complianceForms: true, milestones: true },
    });

    if (!employee) {
      throw new ConflictException('Employee not found');
    }

    const job = employee.job as any;
    const managerId = req.user.employeeId || req.user.userId;

    if (job.managerId !== managerId) {
      throw new ForbiddenException('Only the assigned manager can reject this hire');
    }

    if (employee.status !== 'MANAGER_REVIEW') {
      throw new ConflictException(`Cannot reject hire. Employee status is ${employee.status}`);
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

    await this.db.auditLog.create({
      data: {
        employeeId,
        fromStatus: employee.status,
        toStatus: 'UNDER_REVIEW',
        actorId: managerId,
        actorRole: 'MANAGER',
        note: `Manager rejected hire. Reason: ${dto.reason}`,
      },
    });

    return mapEmployee(updated);
  }
}
