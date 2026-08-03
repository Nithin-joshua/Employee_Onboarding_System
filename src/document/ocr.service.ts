import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Document } from '../interfaces/types.interface';

export interface OcrService {
  extract(doc: Document): Promise<{ fields: Record<string, string>; confidence: number }>;
}

@Injectable()
export class MockOcrService implements OcrService {
  async extract(doc: Document): Promise<{ fields: Record<string, string>; confidence: number }> {
    const filePath = path.join(process.cwd(), 'fixtures', 'ocr-mock', `${doc.type}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return {
        fields: data.fields || {},
        confidence: data.confidence || 1.0,
      };
    } catch (error) {
      // Fallback if file not found or parsing failed
      return {
        fields: { mockKey: 'mockValue' },
        confidence: 0.9,
      };
    }
  }
}
