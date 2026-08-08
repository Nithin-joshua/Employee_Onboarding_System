import { Module, forwardRef } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { MilestoneModule } from '../milestone/milestone.module';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [MilestoneModule, forwardRef(() => EmployeeModule)],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
