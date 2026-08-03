import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { EmployeeModule } from './employee/employee.module';
import { DocumentModule } from './document/document.module';

@Module({
  imports: [DbModule, EmployeeModule, DocumentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
