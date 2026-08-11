import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfGeneratorService {
  async generateFormPDF(
    formType: string,
    candidate: {
      name: string;
      dob: string;
      phone: string;
      email: string;
      title: string;
      department: string;
      joiningDate: string;
    },
    signature?: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Use the default export constructor or standard class constructor
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // Header Banner
      doc.rect(0, 0, 595.28, 80).fill('#1E3A8A');
      doc
        .fillColor('#FFFFFF')
        .fontSize(20)
        .text(`GOVERNMENT OF INDIA COMPLIANCE FORM`, 50, 25, {
          align: 'center',
          underline: true,
        });
      doc
        .fontSize(12)
        .text(`Statutory Registration Document: ${formType}`, 50, 50, {
          align: 'center',
        });

      doc.moveDown(4);

      // Candidate Information Section
      doc.fillColor('#1F2937');
      doc.fontSize(16).text('Candidate Information', { underline: true });
      doc.moveDown(0.5);

      const items = [
        { label: 'Full Name', val: candidate.name },
        { label: 'Date of Birth', val: candidate.dob },
        { label: 'Phone Number', val: candidate.phone },
        { label: 'Email Address', val: candidate.email },
        { label: 'Designation / Title', val: candidate.title },
        { label: 'Department', val: candidate.department },
        { label: 'Date of Joining', val: candidate.joiningDate },
      ];

      items.forEach((item) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`${item.label}:`, { continued: true })
          .font('Helvetica')
          .text(` ${item.val}`);
        doc.moveDown(0.5);
      });

      doc.moveDown(2);

      // Underpinning Declarations
      doc
        .fontSize(14)
        .text('Declarations & Compliance Terms', { underline: true });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(
          'I hereby declare that all the information provided in this compliance declaration is correct and up to code. ' +
            'I agree to be bound by the statutory regulations governing this program.',
          { align: 'justify' },
        );

      doc.moveDown(3);

      // Signature Block
      doc.fontSize(11);
      const currentY = doc.y;
      if (signature) {
        if (signature.startsWith('data:image')) {
          try {
            const base64Data = signature.split(',')[1];
            const sigBuffer = Buffer.from(base64Data, 'base64');
            doc.text('Authorized Signatory: ', 50, currentY);
            doc.image(sigBuffer, 160, currentY - 15, { width: 120, height: 35 });
          } catch (e) {
            doc.text(`Authorized Signatory: ${signature}`, 50, currentY);
          }
        } else {
          doc.text(`Authorized Signatory: ${signature}`, 50, currentY);
        }
      } else {
        doc.text('Authorized Signatory: ________________________', 50, currentY);
      }
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 350, currentY);

      doc.end();
    });
  }
}
