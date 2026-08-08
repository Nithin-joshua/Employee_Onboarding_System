import { Controller, Post, Body } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Roles } from '../auth/roles.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Employee')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationController {
  constructor(private readonly db: DbService) {}

  @Roles('HR')
  @ApiOperation({ summary: 'Create onboarding invitation code' })
  @ApiResponse({ status: 201, description: 'Invitation code generated successfully.' })
  @Post()
  async createInvitation(
    @Body()
    dto: CreateInvitationDto,
  ) {
    // Generate an 8-character random alphanumeric invitation code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

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
