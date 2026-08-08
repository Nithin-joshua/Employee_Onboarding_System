import { Injectable } from '@nestjs/common';
import { Document } from '../interfaces/types.interface';
import { StorageService } from './storage.service';
import { AadhaarSchema } from './ocr-schemas/aadhaar.schema';
import { PanSchema } from './ocr-schemas/pan.schema';
import { EducationSchema } from './ocr-schemas/education.schema';
import { RelievingLetterSchema } from './ocr-schemas/relieving_letter.schema';
import { BankProofSchema } from './ocr-schemas/bank_proof.schema';
import { PhotoSchema } from './ocr-schemas/photo.schema';

/**
 * OcrService extracts structured fields from uploaded documents.
 *
 * Mode is controlled by the OCR_MODE environment variable:
 *
 *   OCR_MODE=mistral  (default / production):
 *     Calls the Mistral OCR API using MISTRAL_API_KEY.
 *     Requires MISTRAL_API_KEY and STORAGE_PROVIDER=supabase (for signed URLs).
 *
 *   OCR_MODE=local:
 *     Reads pre-extracted JSON from prisma/seed-data/ocr/<TYPE>.json.
 *     Intended for local development when Mistral API access is not available.
 *     Files must exist; missing files produce a clear error.
 *
 * There is no silent fallback. Missing configuration produces a runtime error.
 */

interface MistralOcrResponse {
  documentAnnotation: string | Record<string, unknown>;
  overallConfidence?: number;
  pages?: Array<{
    confidence?: number;
    blocks?: Array<{ confidence?: number }>;
  }>;
}

export interface OcrResult {
  fields: Record<string, unknown>;
  confidence: number;
}

export function buildSchemaFor(docType: string): Record<string, unknown> {
  let schema: Record<string, unknown>;
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
        properties: { extractedText: { type: 'string' } },
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

function averageBlockConfidence(response: MistralOcrResponse): number {
  let sum = 0;
  let count = 0;

  const traverse = (obj: unknown): void => {
    if (!obj || typeof obj !== 'object') return;
    const record = obj as Record<string, unknown>;
    if (typeof record['confidence'] === 'number') {
      sum += record['confidence'];
      count++;
    }
    for (const key of Object.keys(record)) {
      traverse(record[key]);
    }
  };

  traverse(response);
  return count > 0 ? sum / count : 0.95;
}

@Injectable()
export class OcrService {
  constructor(private readonly storageService: StorageService) {
    if (!process.env.MISTRAL_API_KEY && process.env.NODE_ENV !== 'test') {
      throw new Error(
        'Configuration Error: MISTRAL_API_KEY environment variable is missing. ' +
          'Please set it to enable Mistral OCR API integration.',
      );
    }
  }

  async extract(doc: Document): Promise<OcrResult> {
    return this.extractViaMistralApi(doc);
  }

  /**
   * Calls the Mistral OCR API.
   * Requires MISTRAL_API_KEY and STORAGE_PROVIDER=supabase for signed URLs.
   */
  private async extractViaMistralApi(doc: Document): Promise<OcrResult> {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Configuration Error: MISTRAL_API_KEY environment variable is required to call Mistral OCR API.',
      );
    }

    if (!doc.storagePath) {
      throw new Error(`Document ${doc.id} does not have a storagePath`);
    }

    const signedUrl = await this.storageService.getSignedUrl(doc.storagePath);

    const response = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
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

    const result = (await response.json()) as MistralOcrResponse;

    const fields: Record<string, unknown> =
      typeof result.documentAnnotation === 'string'
        ? (JSON.parse(result.documentAnnotation) as Record<string, unknown>)
        : (result.documentAnnotation ?? {});

    const confidence =
      result.overallConfidence ?? averageBlockConfidence(result);

    return { fields, confidence };
  }
}
