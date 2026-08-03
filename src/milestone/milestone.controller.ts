import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { CompleteMilestoneDto } from '../employee/dto/transitions.dto';

@Controller('employees/:employeeId')
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Get('milestones')
  getMilestones(@Param('employeeId') employeeId: string) {
    return this.milestoneService.getEmployeeMilestones(employeeId);
  }

  @Post('complete-milestone')
  complete(
    @Param('employeeId') employeeId: string,
    @Body() dto: CompleteMilestoneDto,
  ) {
    return this.milestoneService.completeMilestone(employeeId, dto.type, dto.role);
  }
}
