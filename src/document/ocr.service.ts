import { Injectable } from '@nestjs/common';
import { Document } from '../interfaces/types.interface';
import { StorageService } from './storage.service';
import { AadhaarSchema } from './ocr-schemas/aadhaar.schema';
import { PanSchema } from './ocr-schemas/pan.schema';
import { EducationSchema } from './ocr-schemas/education.schema';
import { RelievingLetterSchema } from './ocr-schemas/relieving_letter.schema';
import { BankProofSchema } from './ocr-schemas/bank_proof.schema';
import { PhotoSchema } from './ocr-schemas/photo.schema';

export function buildSchemaFor(docType: string) {
  let schema: any;
  switch (docType.toUpperCase()) {
    case 'AADHAAR':
      schema = AadhaarSchema;
      break;
    case 'PAN':
      schema = PanSchema;
      break;
    case 'EDUCATION':
      schema = EducationSchema;
      break;
    case 'RELIEVING_LETTER':
      schema = RelievingLetterSchema;
      break;
    case 'BANK_PROOF':
      schema = BankProofSchema;
      break;
    case 'PHOTO':
      schema = PhotoSchema;
      break;
    default:
      schema = {
        type: 'object',
        properties: {
          extractedText: { type: 'string' },
        },
        required: ['extractedText'],
      };
  }

  return {
    type: 'json_schema',
    json_schema: {
      name: `${docType.toLowerCase()}_schema`,
      strict: true,
      schema,
    },
  };
}

function averageBlockConfidence(response: any): number {
  if (!response) return 0.95;
  let sum = 0;
  let count = 0;

  const traverse = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (typeof obj.confidence === 'number') {
      sum += obj.confidence;
      count++;
    }
    for (const key of Object.keys(obj)) {
      traverse(obj[key]);
    }
  };

  traverse(response);
  return count > 0 ? sum / count : 0.95;
}

@Injectable()
export class MockOcrService {
  constructor(private readonly storageService: StorageService) {}

  async extract(doc: Document): Promise<{ fields: Record<string, unknown>; confidence: number }> {
    if (!doc.storagePath) {
      throw new Error(`Document ${doc.id} does not have a storagePath`);
    }

    const signedUrl = await this.storageService.getSignedUrl(doc.storagePath);
    const apiKey = process.env.MISTRAL_API_KEY || 'mock-key';

    const response = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: { type: 'document_url', documentUrl: signedUrl },
        documentAnnotationFormat: buildSchemaFor(doc.type),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Mistral OCR API error: ${response.status} ${errText}`);
    }

    const result = await response.json();

    const fields = typeof result.documentAnnotation === 'string'
      ? JSON.parse(result.documentAnnotation)
      : (result.documentAnnotation || {});

    const confidence = result.overallConfidence ?? averageBlockConfidence(result);

    return {
      fields,
      confidence,
    };
  }
}
