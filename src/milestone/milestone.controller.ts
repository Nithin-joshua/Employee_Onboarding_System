import { Controller, Post, Body, Param, Get, Req } from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { CompleteMilestoneDto } from '../employee/dto/transitions.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('employees/:employeeId')
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Roles('HR', 'MANAGER', 'NEW_HIRE')
  @Get('milestones')
  getMilestones(@Param('employeeId') employeeId: string) {
    return this.milestoneService.getEmployeeMilestones(employeeId);
  }

  @Roles('HR', 'MANAGER')
  @Post('complete-milestone')
  complete(
    @Param('employeeId') employeeId: string,
    @Body() dto: CompleteMilestoneDto,
    @Req() req: any,
  ) {
    return this.milestoneService.completeMilestone(employeeId, dto.type, req.user.role);
  }
}
