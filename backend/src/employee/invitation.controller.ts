import { Controller, Post, Get, Body } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Roles } from '../auth/roles.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';
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
  constructor(private readonly db: DbService) {}

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
      },
    });

    return { code: invitation.code };
  }
}
