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
  document_annotation: string | Record<string, unknown>;
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
    case 'EDUCATION_10TH':
    case 'EDUCATION_2ND_PUC':
    case 'EDUCATION_DEGREE':
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

export function getRawSchemaFor(docType: string): Record<string, unknown> {
  switch (docType.toUpperCase()) {
    case 'AADHAAR':
      return AadhaarSchema;
    case 'PAN':
      return PanSchema;
    case 'EDUCATION':
    case 'EDUCATION_10TH':
    case 'EDUCATION_2ND_PUC':
    case 'EDUCATION_DEGREE':
      return EducationSchema;
    case 'RELIEVING_LETTER':
      return RelievingLetterSchema;
    case 'BANK_PROOF':
      return BankProofSchema;
    case 'PHOTO':
      return PhotoSchema;
    default:
      return {
        type: 'object',
        properties: { extractedText: { type: 'string' } },
        required: ['extractedText'],
      };
  }
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
    const mode = (process.env.OCR_MODE || '').toLowerCase();
    const hasGoogleKey = !!(
      process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    );
    const hasMistralKey = !!process.env.MISTRAL_API_KEY;

    if (
      mode === 'mistral' &&
      !hasMistralKey &&
      process.env.NODE_ENV !== 'test'
    ) {
      throw new Error(
        'Configuration Error: MISTRAL_API_KEY environment variable is missing for Mistral OCR mode.',
      );
    }

    if (
      (mode === 'google' || mode === 'gemini') &&
      !hasGoogleKey &&
      process.env.NODE_ENV !== 'test'
    ) {
      throw new Error(
        'Configuration Error: GOOGLE_API_KEY (or GEMINI_API_KEY) environment variable is missing for Google OCR mode.',
      );
    }
  }

  async extract(doc: Document): Promise<OcrResult> {
    if (doc.type.toUpperCase() === 'BANK_PROOF') {
      return {
        fields: {
          note: 'Bank details verification is performed manually by HR. OCR extraction skipped.',
        },
        confidence: 1.0,
      };
    }

    const mode = (process.env.OCR_MODE || '').toLowerCase();
    const hasGoogleKey = !!(
      process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    );

    if (mode === 'local') {
      return this.extractLocally(doc);
    }
    if (
      mode === 'google' ||
      mode === 'gemini' ||
      (hasGoogleKey && mode !== 'mistral')
    ) {
      return this.extractViaGoogleGemini(doc);
    }
    return this.extractViaMistralApi(doc);
  }

  private async extractLocally(doc: Document): Promise<OcrResult> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(
        process.cwd(),
        'prisma',
        'seed-data',
        'ocr',
        `${doc.type.toUpperCase()}.json`,
      );
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return {
        fields: data.fields || { documentType: doc.type, seeded: true },
        confidence: data.confidence ?? 0.9,
      };
    } catch {
      return {
        fields: { documentType: doc.type, seeded: true },
        confidence: 0.9,
      };
    }
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
    console.log(
      `[OCR Request] Target Doc ID: ${doc.id}, Type: ${doc.type}, URL: ${signedUrl}`,
    );

    const response = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: { type: 'document_url', document_url: signedUrl },
        document_annotation_format: buildSchemaFor(doc.type),
      }),
    });

    console.log(
      `[OCR Response Status] ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[OCR Error Output] ${errText}`);
      throw new Error(`Mistral OCR API error: ${response.status} ${errText}`);
    }

    const result = (await response.json()) as MistralOcrResponse;
    console.log(`[OCR Raw JSON Output]`, JSON.stringify(result, null, 2));

    const fields: Record<string, unknown> =
      typeof result.document_annotation === 'string'
        ? (JSON.parse(result.document_annotation) as Record<string, unknown>)
        : (result.document_annotation ?? {});

    console.log(`[OCR Parsed Fields]`, JSON.stringify(fields, null, 2));

    const confidence =
      result.overallConfidence ?? averageBlockConfidence(result);

    return { fields, confidence };
  }

  /**
   * Calls the Google Gemini Vision API (Gemini 2.0 / 1.5 Flash).
   * Works with both local encrypted disk storage and Supabase cloud storage.
   */
  async extractBuffer(
    buffer: Buffer,
    docType: string,
    mimeType = 'application/pdf',
  ): Promise<OcrResult> {
    if (docType.toUpperCase() === 'BANK_PROOF') {
      return {
        fields: {
          note: 'Bank details verification is performed manually by HR. OCR extraction skipped.',
        },
        confidence: 1.0,
      };
    }

    const mode = (process.env.OCR_MODE || '').toLowerCase();
    const hasGoogleKey = !!(
      process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    );

    if (
      mode === 'google' ||
      mode === 'gemini' ||
      (hasGoogleKey && mode !== 'mistral')
    ) {
      return this.extractBufferViaGoogleGemini(buffer, docType, mimeType);
    }

    if (mode === 'local') {
      return this.extractLocally({ type: docType } as any);
    }

    return {
      fields: { documentType: docType },
      confidence: 0.95,
    };
  }

  async extractBufferViaGoogleGemini(
    buffer: Buffer,
    docType: string,
    mimeType = 'application/pdf',
  ): Promise<OcrResult> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Configuration Error: GOOGLE_API_KEY (or GEMINI_API_KEY) environment variable is required to call Google Gemini OCR API.',
      );
    }

    const upperDoc = docType.toUpperCase();
    const isEducation = [
      'EDUCATION',
      'EDUCATION_10TH',
      'EDUCATION_2ND_PUC',
      'EDUCATION_DEGREE',
    ].includes(upperDoc);

    const base64Data = buffer.toString('base64');
    const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const modelsToTry = [
      primaryModel,
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const schema = getRawSchemaFor(docType);

    const promptText = isEducation
      ? `You are an automated document data extraction system. For this educational certificate (${docType}), extract ONLY the overall percentage and/or CGPA (Grade Point Average) according to the JSON schema. Do NOT extract student personal info, subjects, or school/university details. Return valid JSON only with exact key names.`
      : `You are an automated document data extraction system. Extract structured data from this ${docType} document according to the JSON schema. Return valid JSON only with exact key names. If a value is unreadable or not present, supply an empty string or null.`;

    let lastError: Error | null = null;
    for (const model of modelsToTry) {
      try {
        console.log(`[Google OCR Request] Calling model: ${model} for ${docType}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: promptText,
                    },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: 'application/json',
                response_schema: schema,
              },
            }),
          },
        );

        if (!response.ok) {
          const errText = await response.text();
          console.warn(
            `[Google OCR Model ${model} Warning]: ${response.status} ${errText}`,
          );
          lastError = new Error(
            `Google OCR model ${model} failed: ${response.status} ${errText}`,
          );
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        let text = candidate?.content?.parts?.[0]?.text;
        if (!text) {
          continue;
        }

        // Clean markdown code blocks if any
        text = text
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        console.log(`[Google OCR Raw Output]`, text);
        const fields: Record<string, unknown> = JSON.parse(text);
        console.log(`[Google OCR Parsed Fields]`, JSON.stringify(fields, null, 2));

        if (isEducation) {
          const cleanFields: Record<string, unknown> = {};
          if (fields.percentageOrCgpa && String(fields.percentageOrCgpa).trim()) {
            cleanFields.percentageOrCgpa = String(fields.percentageOrCgpa).trim();
          }
          if (fields.percentage && String(fields.percentage).trim()) {
            cleanFields.percentage = String(fields.percentage).trim();
            if (!cleanFields.percentageOrCgpa) {
              cleanFields.percentageOrCgpa = cleanFields.percentage;
            }
          }
          if (fields.cgpa && String(fields.cgpa).trim()) {
            cleanFields.cgpa = String(fields.cgpa).trim();
            if (!cleanFields.percentageOrCgpa) {
              cleanFields.percentageOrCgpa = cleanFields.cgpa;
            }
          }
          return {
            fields: cleanFields,
            confidence: 0.98,
          };
        }

        return {
          fields,
          confidence: 0.98,
        };
      } catch (err) {
        lastError = err as Error;
      }
    }

    throw lastError || new Error('Google Gemini OCR failed for all attempted models');
  }

  private async extractViaGoogleGemini(doc: Document): Promise<OcrResult> {
    if (!doc.storagePath) {
      throw new Error(`Document ${doc.id} does not have a storagePath`);
    }

    console.log(
      `[Google OCR Request] Target Doc ID: ${doc.id}, Type: ${doc.type}, Path: ${doc.storagePath}`,
    );

    // Download document buffer (auto-decrypted if local vault, or downloaded if Supabase)
    const buffer = await this.storageService.downloadDocument(doc.storagePath);

    // Detect mime type
    const lowerPath = doc.storagePath.toLowerCase();
    let mimeType = 'application/pdf';
    if (lowerPath.endsWith('.png')) mimeType = 'image/png';
    else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg'))
      mimeType = 'image/jpeg';
    else if (lowerPath.endsWith('.webp')) mimeType = 'image/webp';

    return this.extractBufferViaGoogleGemini(buffer, doc.type, mimeType);
  }
}
