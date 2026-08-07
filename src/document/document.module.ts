import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { MockOcrService } from './ocr.service';
import { StorageService } from './storage.service';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [ComplianceModule],
  controllers: [DocumentController],
  providers: [DocumentService, MockOcrService, StorageService],
  exports: [DocumentService, MockOcrService, StorageService],
})
export class DocumentModule {}
