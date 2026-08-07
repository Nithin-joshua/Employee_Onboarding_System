import { Controller, Post, Body } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Roles } from '../auth/roles.decorator';

@Controller('invitations')
export class InvitationController {
  constructor(private readonly db: DbService) {}

  @Roles('HR')
  @Post()
  async createInvitation(
    @Body()
    dto: {
      jobTitle: string;
      department: string;
      managerId: string;
      salary: number;
      joiningDate: string;
    },
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
