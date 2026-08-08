import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { MockOcrService } from './ocr.service';
import { StorageService } from './storage.service';
import { ComplianceModule } from '../compliance/compliance.module';
import { LocalVaultService } from '../common/services/local-vault.service';
import { DocumentParserService } from '../employee/document-parser.service';

@Module({
  imports: [ComplianceModule],
  controllers: [DocumentController],
  providers: [DocumentService, MockOcrService, StorageService, LocalVaultService, DocumentParserService],
  exports: [DocumentService, MockOcrService, StorageService, LocalVaultService, DocumentParserService],
})
export class DocumentModule {}

