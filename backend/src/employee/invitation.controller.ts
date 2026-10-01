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
    // Generate an 8-character random alphanumeric invitation code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    const invitation = await this.db.invitationCode.create({
      data: {
        code,
        jobTitle: dto.jobTitle,
        department: dto.department,
        managerId: dto.managerId,
        salary: Number(dto.salary),
        joiningDate: new Date(dto.joiningDate),
        email: dto.email || null,
      },
    });

    let emailsSent = 0;
    if (dto.email) {
      const emailList = dto.email
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0 && e.includes('@'));

      for (const recipient of emailList) {
        try {
          await this.emailService.sendInvitationEmail(
            recipient,
            dto.jobTitle,
            dto.department,
            invitation.code,
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
    }

    return {
      code: invitation.code,
      email: invitation.email,
      emailsSent,
    };
  }
}
