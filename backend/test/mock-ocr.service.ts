import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Document } from '../src/interfaces/types.interface';
import { OcrResult } from '../src/document/ocr.service';

@Injectable()
export class MockOcrService {
  async extract(doc: Document): Promise<OcrResult> {
    const filePath = path.join(
      process.cwd(),
      'prisma',
      'seed-data',
      'ocr',
      `${doc.type.toUpperCase()}.json`,
    );
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as {
        fields: Record<string, unknown>;
        confidence?: number;
      };
      return {
        fields: data.fields,
        confidence: data.confidence ?? 0.95,
      };
    } catch {
      return {
        fields: { documentType: doc.type, seeded: true },
        confidence: 0.9,
      };
    }
  }
}
