import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentParserService {
  async extractPdfMetadata(
    buffer: Buffer,
    docType?: string,
  ): Promise<Record<string, unknown>> {
    try {
      let text = '';

      // Check if buffer starts with PDF header
      const isPdf =
        buffer &&
        buffer.length > 4 &&
        buffer.slice(0, 5).toString('ascii').startsWith('%PDF');

      if (isPdf) {
        try {
          const pdfModule = await import('pdf-parse');
          const mod = (pdfModule as any).default || pdfModule;

          if (typeof mod === 'function') {
            const parsed = await mod(buffer);
            text = parsed?.text || '';
          } else if (mod && mod.PDFParse) {
            const parser = new mod.PDFParse({ data: buffer });
            const parsed = await parser.getText();
            text = typeof parsed === 'string' ? parsed : (parsed?.text || '');
            if (typeof parser.destroy === 'function') {
              await parser.destroy();
            }
          }
        } catch {
          // If native PDF stream parsing has quirks, fallback to UTF-8 slice
          text = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
        }
      } else {
        // Image or text buffer
        text = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
      }

      const upperType = (docType || '').toUpperCase();
      const isEdu = [
        'EDUCATION',
        'EDUCATION_10TH',
        'EDUCATION_2ND_PUC',
        'EDUCATION_DEGREE',
      ].includes(upperType);

      if (isEdu) {
        const eduMetadata: Record<string, unknown> = {
          confidence: 0.95,
        };

        // Percentage Matcher: e.g. "85.4%" or "Percentage: 85%"
        const percentageMatch = text.match(
          /(?:percentage|percent|aggregate|total\s*marks|marks\s*obtained)?\s*[:=\s]?\s*(\d{1,2}(?:\.\d{1,2})?|\d{3}(?:\.\d{1,2})?)\s*%/i,
        );
        if (percentageMatch && percentageMatch[1]) {
          eduMetadata.percentage = `${percentageMatch[1]}%`;
          eduMetadata.percentageOrCgpa = `${percentageMatch[1]}%`;
        }

        // CGPA Matcher: e.g. "CGPA: 8.4" or "8.4 / 10" or "GPA: 3.8"
        const cgpaMatch = text.match(
          /(?:cgpa|gpa|sgpa|cumulative\s*grade\s*point\s*average)\s*[:=\s]?\s*(\d(?:\.\d{1,2})?)(?:\s*\/\s*(?:10|4))?/i,
        );
        if (cgpaMatch && cgpaMatch[1]) {
          eduMetadata.cgpa = cgpaMatch[1];
          if (!eduMetadata.percentageOrCgpa) {
            eduMetadata.percentageOrCgpa = `${cgpaMatch[1]} CGPA`;
          }
        }

        return eduMetadata;
      }

      const metadata: Record<string, unknown> = {
        confidence: 0.95,
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
    } catch {
      return {
        confidence: 0.95,
      };
    }
  }
}
