import { Injectable } from '@nestjs/common';
import pdf from 'pdf-parse';

interface PdfParseResult {
  text: string;
}

type PdfParserFn = (dataBuffer: Buffer) => Promise<PdfParseResult>;

@Injectable()
export class DocumentParserService {
  async extractPdfMetadata(buffer: Buffer): Promise<Record<string, unknown>> {
    try {
      const pdfParser = (typeof pdf === 'function' ? pdf : (pdf as any).default) as PdfParserFn;
      if (!pdfParser) {
        throw new Error('pdf-parse module is not a function');
      }
      const parsed = await pdfParser(buffer);
      const text = parsed?.text || '';

      const metadata: Record<string, unknown> = {
        confidence: 1.0,
      };

      // Aadhaar Matcher: formatted as 1234-5678-9012 or 1234 5678 9012 or 123456789012
      const aadhaarMatch = text.match(/(\d{4}[-\s]\d{4}[-\s]\d{4})|(\d{12})/);
      if (aadhaarMatch) {
        metadata.aadhaarNumber = aadhaarMatch[0];
      }

      // PAN Matcher: 5 letters, 4 digits, 1 letter
      const panMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]/);
      if (panMatch) {
        metadata.panNumber = panMatch[0];
      }

      // Name Matcher heuristics:
      const nameMatch =
        text.match(/(?:Name|NAME)\s*:\s*([^\n\r]+)/i) ||
        text.match(/(?:Name|NAME)\s+([A-Za-z\s]+)/i);
      if (nameMatch && nameMatch[1]) {
        metadata.name = nameMatch[1].trim();
      }

      // DOB Matcher:
      const dobMatch =
        text.match(/(?:DOB|D\.O\.B|Birth|Born)\s*:\s*([^\n\r]+)/i) ||
        text.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
      if (dobMatch) {
        metadata.dob = dobMatch[1]?.trim() || dobMatch[0];
      }

      return metadata;
    } catch (error) {
      return {
        confidence: 0.0,
        error: (error as Error).message,
      };
    }
  }
}
