import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from './document.service';
import { OcrService, buildSchemaFor } from './ocr.service';
import { StorageService } from './storage.service';
import { ComplianceService } from '../compliance/compliance.service';
import { DocumentParserService } from '../employee/document-parser.service';
import { AuditLogService } from '../db/audit-log.service';
import { DbService } from '../db/db.service';
import { LocalVaultService } from '../common/services/local-vault.service';
import { DocumentController } from './document.controller';
import { Readable } from 'stream';
import * as fs from 'fs/promises';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

process.env.VAULT_ENCRYPTION_KEY = 'test-vault-key-for-unit-tests-only-32b';
process.env.MISTRAL_API_KEY = 'test-mistral-api-key';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
}));

// Mock Supabase storage client
const mockSupabaseStorage = {
  from: jest.fn().mockReturnThis(),
  upload: jest.fn(),
  createSignedUrl: jest.fn(),
  download: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: mockSupabaseStorage,
  })),
}));

describe('Document System Tests', () => {
  let service: DocumentService;
  let db: DbService;
  let ocr: OcrService;
  let storage: StorageService;
  let compliance: ComplianceService;
  let parser: DocumentParserService;
  let audit: AuditLogService;

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
              findFirst: jest.fn(),
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
    compliance = module.get<ComplianceService>(ComplianceService);
    parser = module.get<DocumentParserService>(DocumentParserService);
    audit = module.get<AuditLogService>(AuditLogService);
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
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_id',
        status: 'INVITED',
      } as any);
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

    it('should successfully submit documents if all 6 types are present', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'DOCUMENTS_PENDING',
      } as any);

      jest.spyOn(db.document, 'deleteMany').mockResolvedValue({ count: 1 });
      jest
        .spyOn(db.document, 'create')
        .mockResolvedValue({ id: 'doc_id' } as any);
      jest.spyOn(db.employee, 'update').mockResolvedValue({
        id: 'emp_123',
        status: 'DOCUMENTS_SUBMITTED',
      } as any);

      const docs = [
        { type: 'AADHAAR' },
        { type: 'PAN' },
        { type: 'EDUCATION' },
        { type: 'RELIEVING_LETTER' },
        { type: 'BANK_PROOF' },
        { type: 'PHOTO' },
      ];

      const result = await service.submitDocuments('emp_123', docs, 'NEW_HIRE');
      expect(result.status).toBe('DOCUMENTS_SUBMITTED');
      expect(db.document.deleteMany).toHaveBeenCalledWith({
        where: { employeeId: 'emp_123' },
      });
      expect(db.document.create).toHaveBeenCalledTimes(6);
      expect(audit.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp_123',
          fromStatus: 'DOCUMENTS_PENDING',
          toStatus: 'DOCUMENTS_SUBMITTED',
          actorRole: 'NEW_HIRE',
        }),
        expect.any(Object),
      );
    });
  });

  describe('runExtraction', () => {
    it('should throw ConflictException if status is not DOCUMENTS_SUBMITTED', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'DOCUMENTS_PENDING',
      } as any);

      await expect(service.runExtraction('emp_123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should call ocr service for external/supabase storage path', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'DOCUMENTS_SUBMITTED',
      } as any);

      jest.spyOn(db.document, 'findMany').mockResolvedValue([
        {
          id: 'doc_1',
          employeeId: 'emp_123',
          type: 'PAN',
          status: 'SUBMITTED',
          storagePath: 'emp_123/PAN.pdf',
          extracted: null,
          reviewedBy: null,
          rejectionReason: null,
        },
      ] as any);

      jest.spyOn(ocr, 'extract').mockResolvedValue({
        fields: { name: 'John Doe', pan: 'ABCDE1234F' },
        confidence: 0.98,
      });

      jest.spyOn(db.document, 'update').mockResolvedValue({} as any);
      jest.spyOn(db.employee, 'update').mockResolvedValue({
        id: 'emp_123',
        status: 'UNDER_REVIEW',
      } as any);

      const result = await service.runExtraction('emp_123');
      expect(result.status).toBe('UNDER_REVIEW');
      expect(ocr.extract).toHaveBeenCalled();
      expect(db.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc_1' },
          data: expect.objectContaining({
            status: 'EXTRACTED',
            extracted: { name: 'John Doe', pan: 'ABCDE1234F' },
          }),
        }),
      );
      expect(audit.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          toStatus: 'UNDER_REVIEW',
          actorRole: 'SYSTEM',
        }),
      );
    });

    it('should decrypt local storage file and parse it', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'DOCUMENTS_SUBMITTED',
      } as any);

      jest.spyOn(db.document, 'findMany').mockResolvedValue([
        {
          id: 'doc_2',
          employeeId: 'emp_123',
          type: 'PAN',
          status: 'SUBMITTED',
          storagePath: 'uploads/emp_123/PAN.enc',
          extracted: null,
          reviewedBy: null,
          rejectionReason: null,
        },
      ] as any);

      const mockBuffer = Buffer.from('mock-pdf-data');
      jest.spyOn(storage, 'downloadDocument').mockResolvedValue(mockBuffer);
      jest.spyOn(parser, 'extractPdfMetadata').mockResolvedValue({
        name: 'Jane Doe',
        confidence: 0.95,
      });

      jest.spyOn(db.document, 'update').mockResolvedValue({} as any);
      jest.spyOn(db.employee, 'update').mockResolvedValue({
        id: 'emp_123',
        status: 'UNDER_REVIEW',
      } as any);

      const result = await service.runExtraction('emp_123');
      expect(result.status).toBe('UNDER_REVIEW');
      expect(storage.downloadDocument).toHaveBeenCalledWith(
        'uploads/emp_123/PAN.enc',
      );
      expect(parser.extractPdfMetadata).toHaveBeenCalledWith(mockBuffer);
      expect(db.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc_2' },
          data: expect.objectContaining({
            extracted: { name: 'Jane Doe', confidence: 0.95 },
            status: 'EXTRACTED',
          }),
        }),
      );
    });

    it('should handle parser errors by setting confidence 0.0', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'DOCUMENTS_SUBMITTED',
      } as any);

      jest.spyOn(db.document, 'findMany').mockResolvedValue([
        {
          id: 'doc_3',
          employeeId: 'emp_123',
          type: 'PAN',
          status: 'SUBMITTED',
          storagePath: 'uploads/emp_123/PAN.enc',
          extracted: null,
          reviewedBy: null,
          rejectionReason: null,
        },
      ] as any);

      jest
        .spyOn(storage, 'downloadDocument')
        .mockRejectedValue(new Error('Decryption Failed'));

      jest.spyOn(db.document, 'update').mockResolvedValue({} as any);
      jest.spyOn(db.employee, 'update').mockResolvedValue({
        id: 'emp_123',
        status: 'UNDER_REVIEW',
      } as any);

      const result = await service.runExtraction('emp_123');
      expect(result.status).toBe('UNDER_REVIEW');
      expect(db.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc_3' },
          data: expect.objectContaining({
            status: 'EXTRACTED',
            extracted: expect.objectContaining({
              error: 'Failed to decrypt/parse local file: Decryption Failed',
            }),
          }),
        }),
      );
    });
  });

  describe('verifyDocument', () => {
    it('should verify document successfully if HR and status is UNDER_REVIEW', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'UNDER_REVIEW',
      } as any);

      jest.spyOn(db.document, 'findFirst').mockResolvedValue({
        id: 'doc_1',
        employeeId: 'emp_123',
      } as any);

      jest.spyOn(db.document, 'update').mockResolvedValue({} as any);

      const result = await service.verifyDocument('emp_123', 'doc_1', 'HR');
      expect(db.document.update).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        data: {
          status: 'VERIFIED',
          reviewedBy: 'HR',
          rejectionReason: null,
        },
      });
    });

    it('should throw NotFoundException if document not found', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'UNDER_REVIEW',
      } as any);

      jest.spyOn(db.document, 'findFirst').mockResolvedValue(null);

      await expect(
        service.verifyDocument('emp_123', 'doc_1', 'HR'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectDocument', () => {
    it('should reject document and roll back employee status to DOCUMENTS_PENDING', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'UNDER_REVIEW',
      } as any);

      jest.spyOn(db.document, 'findFirst').mockResolvedValue({
        id: 'doc_1',
        employeeId: 'emp_123',
        type: 'PAN',
      } as any);

      jest.spyOn(db.document, 'update').mockResolvedValue({} as any);
      jest.spyOn(db.employee, 'update').mockResolvedValue({
        id: 'emp_123',
        status: 'DOCUMENTS_PENDING',
      } as any);

      const result = await service.rejectDocument(
        'emp_123',
        'doc_1',
        'Blurry photo',
        'HR',
      );
      expect(result.status).toBe('DOCUMENTS_PENDING');
      expect(db.document.update).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Blurry photo',
          reviewedBy: 'HR',
        },
      });
      expect(audit.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: 'UNDER_REVIEW',
          toStatus: 'DOCUMENTS_PENDING',
          actorId: 'HR',
          note: 'Document rejected: PAN. Reason: Blurry photo',
        }),
        expect.any(Object),
      );
    });
  });

  describe('approveReview', () => {
    it('should approve review and move employee to MANAGER_REVIEW when all docs are verified', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'UNDER_REVIEW',
      } as any);

      jest.spyOn(db.document, 'findMany').mockResolvedValue([
        { id: '1', status: 'VERIFIED' },
        { id: '2', status: 'VERIFIED' },
      ] as any);

      jest.spyOn(db.employee, 'update').mockResolvedValue({
        id: 'emp_123',
        status: 'MANAGER_REVIEW',
      } as any);

      const result = await service.approveReview('emp_123', 'HR');
      expect(db.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'emp_123' },
          data: { status: 'MANAGER_REVIEW' },
        }),
      );
    });

    it('should throw ConflictException if any document is rejected', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'UNDER_REVIEW',
      } as any);

      jest.spyOn(db.document, 'findMany').mockResolvedValue([
        { id: '1', status: 'VERIFIED' },
        { id: '2', status: 'REJECTED' },
      ] as any);

      await expect(service.approveReview('emp_123', 'HR')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if any document is not verified', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
        status: 'UNDER_REVIEW',
      } as any);

      jest.spyOn(db.document, 'findMany').mockResolvedValue([
        { id: '1', status: 'VERIFIED' },
        { id: '2', status: 'SUBMITTED' },
      ] as any);

      await expect(service.approveReview('emp_123', 'HR')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('uploadDocumentFile', () => {
    it('should upload document, extract metadata and update existing document record', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
      } as any);

      jest
        .spyOn(storage, 'uploadDocument')
        .mockResolvedValue('uploads/emp_123/PAN.enc');
      jest.spyOn(parser, 'extractPdfMetadata').mockResolvedValue({
        name: 'John Doe',
      });

      jest.spyOn(db.document, 'findFirst').mockResolvedValue({
        id: 'doc_existing',
        employeeId: 'emp_123',
        type: 'PAN',
      } as any);

      jest.spyOn(db.document, 'update').mockResolvedValue({
        id: 'doc_existing',
        employeeId: 'emp_123',
        type: 'PAN',
        status: 'SUBMITTED',
        storagePath: 'uploads/emp_123/PAN.enc',
        extracted: { name: 'John Doe' },
      } as any);

      const buffer = Buffer.from('pdf-data');
      const result = await service.uploadDocumentFile(
        'emp_123',
        'PAN',
        buffer,
        'application/pdf',
      );

      expect(storage.uploadDocument).toHaveBeenCalledWith(
        'emp_123',
        'PAN',
        buffer,
        'application/pdf',
      );
      expect(db.document.update).toHaveBeenCalled();
      expect(result.id).toBe('doc_existing');
    });

    it('should upload document and create new record if none exists', async () => {
      jest.spyOn(db.employee, 'findUnique').mockResolvedValue({
        id: 'emp_123',
      } as any);

      jest
        .spyOn(storage, 'uploadDocument')
        .mockResolvedValue('uploads/emp_123/PAN.enc');
      jest.spyOn(parser, 'extractPdfMetadata').mockResolvedValue({
        name: 'John Doe',
      });

      jest.spyOn(db.document, 'findFirst').mockResolvedValue(null);
      jest.spyOn(db.document, 'create').mockResolvedValue({
        id: 'doc_new',
        employeeId: 'emp_123',
        type: 'PAN',
        status: 'SUBMITTED',
        storagePath: 'uploads/emp_123/PAN.enc',
        extracted: { name: 'John Doe' },
      } as any);

      const buffer = Buffer.from('pdf-data');
      const result = await service.uploadDocumentFile(
        'emp_123',
        'PAN',
        buffer,
        'application/pdf',
      );

      expect(db.document.create).toHaveBeenCalled();
      expect(result.id).toBe('doc_new');
    });
  });

  describe('getEmployeeDocuments & curateForReview mapping', () => {
    it('should get employee documents correctly', async () => {
      jest.spyOn(db.document, 'findMany').mockResolvedValue([
        {
          id: 'doc_1',
          employeeId: 'emp_123',
          type: 'PAN',
          status: 'SUBMITTED',
          storagePath: 'path',
          extracted: null,
          reviewedBy: null,
          rejectionReason: null,
        },
      ] as any);

      const result = await service.getEmployeeDocuments('emp_123');
      expect(result[0].id).toBe('doc_1');
    });

    it('should curate documents correctly mapping Aadhaar, PAN, and Education fields', async () => {
      jest.spyOn(db.document, 'findMany').mockResolvedValue([
        {
          id: 'doc_aadhaar',
          employeeId: 'emp_123',
          type: 'AADHAAR',
          status: 'SUBMITTED',
          storagePath: 'path_aadhaar',
          extracted: {
            name: 'Aadhaar Name',
            dob: '2000-01-01',
            aadhaarNumber: '111122223333',
            confidence: 0.99,
          },
        },
        {
          id: 'doc_pan',
          employeeId: 'emp_123',
          type: 'PAN',
          status: 'SUBMITTED',
          storagePath: 'path_pan',
          extracted: {
            name: 'Pan Name',
            panNumber: 'ABCDE1234F',
            confidence: 0.97,
          },
        },
        {
          id: 'doc_edu',
          employeeId: 'emp_123',
          type: 'EDUCATION',
          status: 'SUBMITTED',
          storagePath: 'path_edu',
          extracted: {
            confidence: 0.88,
          },
        },
      ] as any);

      const result = await service.curateForReview('emp_123');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'doc_aadhaar',
            extracted: {
              name: 'Aadhaar Name',
              dob: '2000-01-01',
              aadhaarNumber: '111122223333',
              confidence: 0.99,
            },
          }),
          expect.objectContaining({
            id: 'doc_pan',
            extracted: {
              name: 'Pan Name',
              panNumber: 'ABCDE1234F',
              confidence: 0.97,
            },
          }),
          expect.objectContaining({
            id: 'doc_edu',
            extracted: {
              documentType: 'EDUCATION',
              confidence: 0.88,
            },
          }),
        ]),
      );
    });
  });
});

describe('StorageService', () => {
  let storageService: StorageService;
  let vaultService: LocalVaultService;

  beforeEach(() => {
    vaultService = new LocalVaultService();
    jest.clearAllMocks();
  });

  describe('Local mode', () => {
    beforeEach(() => {
      process.env.STORAGE_PROVIDER = 'local';
      storageService = new StorageService(vaultService);
    });

    it('should upload local encrypted file and write to file system', async () => {
      const mkdirMock = fs.mkdir as jest.Mock;
      const writeFileMock = fs.writeFile as jest.Mock;
      mkdirMock.mockResolvedValue(undefined);
      writeFileMock.mockResolvedValue(undefined);

      const pathResult = await storageService.uploadDocument(
        'emp_123',
        'PAN',
        Buffer.from('my-file-data'),
        'application/pdf',
      );

      expect(pathResult).toBe('uploads/emp_123/PAN.enc');
      expect(mkdirMock).toHaveBeenCalled();
      expect(writeFileMock).toHaveBeenCalled();
    });

    it('should throw on getSignedUrl for local storage', async () => {
      await expect(
        storageService.getSignedUrl('uploads/emp_123/PAN.enc'),
      ).rejects.toThrow(
        'getSignedUrl is only available when STORAGE_PROVIDER=supabase',
      );
    });

    it('should download local file and decrypt it', async () => {
      const dummyRaw = Buffer.from('hello-world-decrypted');
      const { encryptedData, iv, authTag } =
        vaultService.encryptBuffer(dummyRaw);
      const packed = vaultService.pack(encryptedData, iv, authTag);

      const readFileMock = fs.readFile as jest.Mock;
      readFileMock.mockResolvedValue(packed);

      const decrypted = await storageService.downloadDocument(
        'uploads/emp_123/PAN.enc',
      );
      expect(decrypted.toString()).toBe('hello-world-decrypted');
    });
  });

  describe('Supabase mode', () => {
    beforeEach(() => {
      process.env.STORAGE_PROVIDER = 'supabase';
      process.env.SUPABASE_URL = 'http://localhost:54321';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
      storageService = new StorageService(vaultService);
    });

    afterEach(() => {
      delete process.env.STORAGE_PROVIDER;
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    it('should upload file to Supabase bucket', async () => {
      mockSupabaseStorage.upload.mockResolvedValue({ error: null });

      const pathResult = await storageService.uploadDocument(
        'emp_123',
        'PAN',
        Buffer.from('data'),
        'application/pdf',
      );

      expect(pathResult).toBe('emp_123/PAN.pdf');
      expect(mockSupabaseStorage.upload).toHaveBeenCalledWith(
        'emp_123/PAN.pdf',
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'application/pdf' }),
      );
    });

    it('should generate signed url from Supabase client', async () => {
      mockSupabaseStorage.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/signed-path' },
        error: null,
      });

      const url = await storageService.getSignedUrl('emp_123/PAN.pdf');
      expect(url).toBe('https://supabase.co/signed-path');
      expect(mockSupabaseStorage.createSignedUrl).toHaveBeenCalledWith(
        'emp_123/PAN.pdf',
        600,
      );
    });

    it('should download and return buffer from Supabase client', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockBlob = {
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      };
      mockSupabaseStorage.download.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      const buf = await storageService.downloadDocument('emp_123/PAN.pdf');
      expect(buf).toBeInstanceOf(Buffer);
      expect(mockSupabaseStorage.download).toHaveBeenCalledWith(
        'emp_123/PAN.pdf',
      );
    });
  });
});

describe('OcrService', () => {
  let ocrService: OcrService;
  let storageService: StorageService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    storageService = {
      getSignedUrl: jest.fn().mockResolvedValue('http://signed-url'),
    } as any;
    ocrService = new OcrService(storageService);

    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('should run Mistral OCR extraction and return structured response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          documentAnnotation: JSON.stringify({
            name: 'Aadhaar Name',
            dob: '2000-01-01',
          }),
          overallConfidence: 0.92,
        }),
    });

    const doc = {
      id: 'doc_123',
      type: 'AADHAAR',
      storagePath: 'emp_123/AADHAAR.pdf',
    } as any;

    const res = await ocrService.extract(doc);
    expect(res.confidence).toBe(0.92);
    expect(res.fields.name).toBe('Aadhaar Name');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/ocr',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('mistral-ocr-latest'),
      }),
    );
  });

  it('should fallback to average block confidence if overallConfidence is missing', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          documentAnnotation: {
            name: 'PAN Name',
          },
          pages: [
            {
              blocks: [{ confidence: 0.8 }, { confidence: 0.9 }],
            },
          ],
        }),
    });

    const doc = {
      id: 'doc_123',
      type: 'PAN',
      storagePath: 'emp_123/PAN.pdf',
    } as any;

    const res = await ocrService.extract(doc);
    // 0.85 average
    expect(res.confidence).toBeCloseTo(0.85, 5);
  });

  it('should validate schemas generated by buildSchemaFor', () => {
    const schemas = [
      'AADHAAR',
      'PAN',
      'EDUCATION',
      'RELIEVING_LETTER',
      'BANK_PROOF',
      'PHOTO',
      'UNKNOWN',
    ];

    for (const key of schemas) {
      const res = buildSchemaFor(key);
      expect(res).toBeDefined();
      expect(res.type).toBe('json_schema');
      expect(res.json_schema).toHaveProperty('strict', true);
    }
  });
});

describe('DocumentController Endpoints Mapping', () => {
  let controller: DocumentController;
  let service: DocumentService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        {
          provide: DocumentService,
          useValue: {
            getEmployeeDocuments: jest.fn().mockResolvedValue([]),
            curateForReview: jest.fn().mockResolvedValue([]),
            submitDocuments: jest.fn().mockResolvedValue({}),
            runExtraction: jest.fn().mockResolvedValue({}),
            verifyDocument: jest.fn().mockResolvedValue({}),
            rejectDocument: jest.fn().mockResolvedValue({}),
            approveReview: jest.fn().mockResolvedValue({}),
            uploadDocumentFile: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: DbService,
          useValue: {
            employee: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
    service = module.get<DocumentService>(DocumentService);
  });

  it('should map getDocs to getEmployeeDocuments', async () => {
    await controller.getDocs('emp_123');
    expect(service.getEmployeeDocuments).toHaveBeenCalledWith('emp_123');
  });

  it('should map getDocsForReview to curateForReview', async () => {
    await controller.getDocsForReview('emp_123');
    expect(service.curateForReview).toHaveBeenCalledWith('emp_123');
  });

  it('should map submit to submitDocuments', async () => {
    const req = { user: { role: 'NEW_HIRE' } } as any;
    await controller.submit('emp_123', { docs: [{ type: 'PAN' }] }, req);
    expect(service.submitDocuments).toHaveBeenCalledWith(
      'emp_123',
      [{ type: 'PAN' }],
      'NEW_HIRE',
    );
  });

  it('should map runExtraction', async () => {
    await controller.runExtraction('emp_123');
    expect(service.runExtraction).toHaveBeenCalledWith('emp_123');
  });

  it('should map verify to verifyDocument', async () => {
    const req = { user: { role: 'HR' } } as any;
    await controller.verify('emp_123', { docId: 'doc_1' }, req);
    expect(service.verifyDocument).toHaveBeenCalledWith(
      'emp_123',
      'doc_1',
      'HR',
    );
  });

  it('should map reject to rejectDocument', async () => {
    const req = { user: { role: 'HR' } } as any;
    await controller.reject(
      'emp_123',
      { docId: 'doc_1', reason: 'bad signature' },
      req,
    );
    expect(service.rejectDocument).toHaveBeenCalledWith(
      'emp_123',
      'doc_1',
      'bad signature',
      'HR',
    );
  });

  it('should map approve to approveReview', async () => {
    const req = { user: { role: 'HR' } } as any;
    await controller.approve('emp_123', req);
    expect(service.approveReview).toHaveBeenCalledWith('emp_123', 'HR');
  });

  it('should map upload to uploadDocumentFile', async () => {
    const file = { buffer: Buffer.from('data'), mimetype: 'application/pdf' };
    await controller.upload('emp_123', 'PAN', file);
    expect(service.uploadDocumentFile).toHaveBeenCalledWith(
      'emp_123',
      'PAN',
      file.buffer,
      file.mimetype,
    );
  });
});
