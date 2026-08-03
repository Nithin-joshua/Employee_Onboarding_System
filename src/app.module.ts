import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { EmployeeModule } from './employee/employee.module';
import { DocumentModule } from './document/document.module';
import { ComplianceModule } from './compliance/compliance.module';
import { MilestoneModule } from './milestone/milestone.module';

@Module({
  imports: [DbModule, EmployeeModule, DocumentModule, ComplianceModule, MilestoneModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
