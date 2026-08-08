import { Module, Global } from '@nestjs/common';
import { DbService } from './db.service';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  providers: [DbService, AuditLogService],
  exports: [DbService, AuditLogService],
})
export class DbModule {}
