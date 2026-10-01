import { Controller, Post, Get, Body } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Roles } from '../auth/roles.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { EmailService } from '../email/email.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import * as crypto from 'crypto';

@ApiTags('Employee')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationController {
  constructor(
    private readonly db: DbService,
    private readonly emailService: EmailService,
  ) {}

  @Roles('HR')
  @Get()
  async listInvitations() {
    return this.db.invitationCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Roles('HR')
  @ApiOperation({ summary: 'Create onboarding invitation code' })
  @ApiResponse({
    status: 201,
    description: 'Invitation code generated successfully.',
  })
  @Post()
  async createInvitation(
    @Body()
    dto: CreateInvitationDto,
  ) {
    let emailList: string[] = [];
    if (Array.isArray(dto.emails)) {
      emailList = dto.emails.map((e) => String(e).trim()).filter((e) => e.includes('@'));
    } else if (typeof dto.emails === 'string' && dto.emails.trim()) {
      emailList = dto.emails
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));
    } else if (dto.email) {
      emailList = dto.email
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));
    }

    emailList = Array.from(new Set(emailList));

    // Multi-candidate creation
    if (emailList.length > 1) {
      const results: { code: string; email: string }[] = [];
      let emailsSent = 0;

      for (const recipient of emailList) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        await this.db.invitationCode.create({
          data: {
            code,
            jobTitle: dto.jobTitle,
            department: dto.department,
            managerId: dto.managerId,
            salary: Number(dto.salary),
            joiningDate: new Date(dto.joiningDate),
            email: recipient,
          },
        });
        results.push({ code, email: recipient });

        try {
          await this.emailService.sendInvitationEmail(
            recipient,
            dto.jobTitle,
            dto.department,
            code,
            dto.joiningDate,
          );
          emailsSent++;
        } catch (err) {
          console.error(
            `[InvitationController] Failed to send invitation email to ${recipient}:`,
            err,
          );
        }
      }

      return {
        codes: results.map((r) => r.code),
        code: results[0].code,
        email: results.map((r) => r.email).join(', '),
        emailsSent,
        count: results.length,
      };
    }

    // Single creation
    const singleEmail = emailList[0] || null;
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    const invitation = await this.db.invitationCode.create({
      data: {
        code,
        jobTitle: dto.jobTitle,
        department: dto.department,
        managerId: dto.managerId,
        salary: Number(dto.salary),
        joiningDate: new Date(dto.joiningDate),
        email: singleEmail,
      },
    });

    let emailsSent = 0;
    if (singleEmail) {
      try {
        await this.emailService.sendInvitationEmail(
          singleEmail,
          dto.jobTitle,
          dto.department,
          invitation.code,
          dto.joiningDate,
        );
        emailsSent = 1;
      } catch (err) {
        console.error(
          `[InvitationController] Failed to send invitation email to ${singleEmail}:`,
          err,
        );
      }
    }

    return {
      code: invitation.code,
      email: invitation.email,
      emailsSent,
    };
  }

  @Roles('HR')
  @ApiOperation({ summary: 'Resend invitation email to selected codes' })
  @Post('resend')
  async resendInvitations(@Body() dto: { codes: string[] }) {
    const codes = dto.codes || [];
    const invitations = await this.db.invitationCode.findMany({
      where: { code: { in: codes } },
    });

    let sentCount = 0;
    for (const inv of invitations) {
      if (inv.email) {
        try {
          await this.emailService.sendInvitationEmail(
            inv.email,
            inv.jobTitle,
            inv.department,
            inv.code,
            inv.joiningDate ? inv.joiningDate.toISOString() : undefined,
          );
          sentCount++;
        } catch (err) {
          console.error(
            `[InvitationController] Failed to resend to ${inv.email}:`,
            err,
          );
        }
      }
    }
    return { sentCount, total: invitations.length };
  }
}
