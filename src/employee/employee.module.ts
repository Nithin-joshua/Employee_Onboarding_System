import { Module, forwardRef } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { InvitationController } from './invitation.controller';
import { ManagerReviewController } from './manager-review.controller';
import { AuditController } from './audit.controller';
import { ComplianceRuleService } from './compliance-rule.service';
import { ComplianceModule } from '../compliance/compliance.module';
import { OutboxService } from './outbox.service';
import { EmployeeStatusListener } from './employee-status.listener';
import { PdfGeneratorService } from './pdf-generator.service';
import { DbModule } from '../db/db.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [forwardRef(() => ComplianceModule), DbModule, EmailModule],
  controllers: [
    EmployeeController,
    InvitationController,
    ManagerReviewController,
    AuditController,
  ],
  providers: [
    EmployeeService,
    ComplianceRuleService,
    OutboxService,
    EmployeeStatusListener,
    PdfGeneratorService,
  ],
  exports: [
    EmployeeService,
    ComplianceRuleService,
    OutboxService,
    PdfGeneratorService,
  ],
})
export class EmployeeModule {}
