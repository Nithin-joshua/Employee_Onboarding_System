import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../src/document/storage.service';
import { MockOcrService } from '../src/document/ocr.service';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Live OCR Integration Test (Manual)', () => {
  let storageService: StorageService;
  let ocrService: MockOcrService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [StorageService, MockOcrService],
    }).compile();

    storageService = moduleFixture.get<StorageService>(StorageService);
    ocrService = moduleFixture.get<MockOcrService>(MockOcrService);
  });

  it('should run live upload and ocr extraction', async () => {
    if (
      !process.env.MISTRAL_API_KEY ||
      process.env.MISTRAL_API_KEY.includes('mock') ||
      !process.env.SUPABASE_URL ||
      process.env.SUPABASE_URL.includes('mock')
    ) {
      console.warn(
        'Skipping live OCR test: MISTRAL_API_KEY or SUPABASE_URL is not configured with real values',
      );
      return;
    }

    const docType = 'PAN';
    const employeeId = 'test_integration_emp';
    const sampleBuffer = Buffer.from('%PDF-1.4 ... mock pdf content ...');

    // 1. Upload to Supabase Storage
    const storagePath = await storageService.uploadDocument(
      employeeId,
      docType,
      sampleBuffer,
      'application/pdf',
    );
    expect(storagePath).toBeDefined();

    // 2. Perform OCR
    const doc = {
      id: 'doc_test_123',
      employeeId,
      type: docType as any,
      status: 'SUBMITTED' as any,
      extracted: null,
      reviewedBy: null,
      rejectionReason: null,
      storagePath,
    };

    const result = await ocrService.extract(doc);
    console.log('Live OCR result:', result);
    expect(result.fields).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });
});
