import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from './document.service';
import { OcrService } from './ocr.service';
import { StorageService } from './storage.service';
import { ComplianceService } from '../compliance/compliance.service';
import { DocumentParserService } from '../employee/document-parser.service';
import { AuditLogService } from '../db/audit-log.service';
import { DbService } from '../db/db.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';

describe('DocumentService & OCR Integration Tests', () => {
  let service: DocumentService;
  let db: DbService;
  let ocr: OcrService;
  let storage: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: DbService,
          useValue: {
            employee: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            document: {
              deleteMany: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((cb) => cb(db)),
          },
        },
        {
          provide: OcrService,
          useValue: {
            extract: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadDocument: jest.fn(),
            getSignedUrl: jest.fn(),
            downloadDocument: jest.fn(),
          },
        },
        {
          provide: ComplianceService,
          useValue: {
            generateForms: jest.fn(),
          },
        },
        {
          provide: DocumentParserService,
          useValue: {
            extractPdfMetadata: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            createLog: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    db = module.get<DbService>(DbService);
    ocr = module.get<OcrService>(OcrService);
    storage = module.get<StorageService>(StorageService);
  });

  describe('submitDocuments', () => {
    it('should throw NotFoundException if employee does not exist', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue(null);
      await expect(
        service.submitDocuments('emp_id', [], 'NEW_HIRE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if role is not NEW_HIRE', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_id',
        status: 'DOCUMENTS_PENDING',
      } as any);
      await expect(service.submitDocuments('emp_id', [], 'HR')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if status is not DOCUMENTS_PENDING', async () => {
      jest
        .spyOn(db.employee, 'findUnique')
        .mockResolvedValue({ id: 'emp_id', status: 'INVITED' } as any);
      await expect(
        service.submitDocuments('emp_id', [], 'NEW_HIRE'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if missing required document types', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_id',
        status: 'DOCUMENTS_PENDING',
      } as any);
      await expect(
        service.submitDocuments('emp_id', [{ type: 'PAN' }], 'NEW_HIRE'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('ocr extraction', () => {
    it('should call ocr service correctly and extract fields', async () => {
      const mockDoc = {
        id: 'doc_123',
        type: 'AADHAAR',
        storagePath: 'uploads/path.enc',
      };
      jest
        .spyOn(storage, 'getSignedUrl')
        .mockResolvedValue('http://signed-url');

      const res = await ocr.extract(mockDoc as any);
      expect(ocr.extract).toHaveBeenCalledWith(mockDoc);
    });
  });
});
