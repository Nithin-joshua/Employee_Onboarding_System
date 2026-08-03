import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
  imports: [DbModule, EmployeeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
