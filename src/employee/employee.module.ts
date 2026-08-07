import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { InvitationController } from './invitation.controller';
import { ManagerReviewController } from './manager-review.controller';

@Module({
  controllers: [EmployeeController, InvitationController, ManagerReviewController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
