import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { OcrService } from './ocr.service';
import { StorageService } from './storage.service';
import { ComplianceModule } from '../compliance/compliance.module';
import { LocalVaultService } from '../common/services/local-vault.service';
import { DocumentParserService } from '../employee/document-parser.service';

@Module({
  imports: [ComplianceModule],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    OcrService,
    StorageService,
    LocalVaultService,
    DocumentParserService,
  ],
  exports: [
    DocumentService,
    OcrService,
    StorageService,
    LocalVaultService,
    DocumentParserService,
  ],
})
export class DocumentModule {}
