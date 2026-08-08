import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditLogService } from '../db/audit-log.service';
import { Document, Employee } from '../interfaces/types.interface';
import { OcrService } from './ocr.service';
import { StorageService } from './storage.service';
import { ComplianceService } from '../compliance/compliance.service';
import { mapEmployee } from '../employee/employee.service';
import { DocumentParserService } from '../employee/document-parser.service';
import * as crypto from 'crypto';

const REQUIRED_DOC_TYPES = [
  'AADHAAR',
  'PAN',
  'EDUCATION',
  'RELIEVING_LETTER',
  'BANK_PROOF',
  'PHOTO',
];

@Injectable()
export class DocumentService {
  constructor(
    private readonly db: DbService,
    private readonly ocrService: OcrService,
    private readonly storageService: StorageService,
    private readonly complianceService: ComplianceService,
    private readonly documentParserService: DocumentParserService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async getEmployeeOrThrow(id: string): Promise<Employee> {
    const employee = await this.db.employee.findUnique({
      where: { id },
      include: {
        documents: true,
        complianceForms: true,
        milestones: true,
      },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return mapEmployee(employee);
  }

  private validateRole(role: string, allowed: string[]) {
    if (allowed.includes('SYSTEM') && role === 'SYSTEM') {
      return;
    }
    if (allowed.includes('HR') && role === 'HR') {
      return;
    }
    if (allowed.includes('NEW_HIRE') && role === 'NEW_HIRE') {
      return;
    }
    throw new ForbiddenException(
      `Role ${role} is not authorized for this action`,
    );
  }

  // DOCUMENTS_PENDING -> DOCUMENTS_SUBMITTED
  async submitDocuments(
    employeeId: string,
    docs: { type: string }[],
    role: string,
  ): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['NEW_HIRE']);

    if (employee.status !== 'DOCUMENTS_PENDING') {
      throw new ConflictException(
        `Cannot submit documents. Employee status is ${employee.status}`,
      );
    }

    const submittedTypes = docs.map((d) => d.type);
    const hasAll = REQUIRED_DOC_TYPES.every((type) =>
      submittedTypes.includes(type),
    );
    if (!hasAll) {
      throw new ConflictException(
        'All 6 required document types must be present',
      );
    }

    const updated = await this.db.$transaction(async (tx) => {
      // Delete existing documents for this employee
      await tx.document.deleteMany({
        where: { employeeId },
      });

      for (const docType of REQUIRED_DOC_TYPES) {
        await tx.document.create({
          data: {
            id: crypto.randomUUID(),
            employeeId: employeeId,
            type: docType as any,
            status: 'SUBMITTED',
            extracted: undefined,
            reviewedBy: null,
            rejectionReason: null,
            storagePath: `${employeeId}/${docType.toUpperCase()}.pdf`,
          },
        });
      }

      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: {
          status: 'DOCUMENTS_SUBMITTED',
        },
        include: {
          documents: true,
          complianceForms: true,
          milestones: true,
        },
      });

      await this.auditLogService.createLog(
        {
          employeeId,
          fromStatus: employee.status,
          toStatus: 'DOCUMENTS_SUBMITTED',
          actorId: employeeId,
          actorRole: 'NEW_HIRE',
          note: 'All required documents submitted by candidate',
        },
        tx,
      );

      return emp;
    });

    return mapEmployee(updated);
  }

  // DOCUMENTS_SUBMITTED -> UNDER_REVIEW
  async runExtraction(employeeId: string): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);

    if (employee.status !== 'DOCUMENTS_SUBMITTED') {
      throw new ConflictException(
        `Cannot run extraction. Employee status is ${employee.status}`,
      );
    }

    const docs = await this.db.document.findMany({
      where: { employeeId },
    });

    for (const doc of docs) {
      // In case storagePath isn't populated (e.g. from custom workflow), assign fallback
      const storagePath = doc.storagePath || `${employeeId}/${doc.type}.pdf`;

      let result: { fields: Record<string, any>; confidence: number };

      if (storagePath.startsWith('uploads/')) {
        try {
          const decryptedBuffer =
            await this.storageService.downloadDocument(storagePath);
          const fields =
            await this.documentParserService.extractPdfMetadata(
              decryptedBuffer,
            );
          result = {
            fields,
            confidence: fields.confidence ?? 1.0,
          };
        } catch (err) {
          result = {
            fields: {
              error: `Failed to decrypt/parse local file: ${(err as Error).message}`,
            },
            confidence: 0.0,
          };
        }
      } else {
        result = await this.ocrService.extract({
          ...doc,
          storagePath,
        } as any);
      }

      await this.db.document.update({
        where: { id: doc.id },
        data: {
          extracted: result.fields as any,
          status: 'EXTRACTED',
          storagePath,
        },
      });
    }

    const updated = await this.db.employee.update({
      where: { id: employeeId },
      data: {
        status: 'UNDER_REVIEW',
      },
      include: {
        documents: true,
        complianceForms: true,
        milestones: true,
      },
    });

    await this.auditLogService.createLog({
      employeeId,
      fromStatus: employee.status,
      toStatus: 'UNDER_REVIEW',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      note: 'OCR document data extraction completed',
    });

    return mapEmployee(updated);
  }

  // HR verifies document
  async verifyDocument(
    employeeId: string,
    docId: string,
    role: string,
  ): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR']);

    if (employee.status !== 'UNDER_REVIEW') {
      throw new ConflictException(
        `Cannot verify document. Employee status is ${employee.status}`,
      );
    }

    const doc = await this.db.document.findFirst({
      where: { id: docId, employeeId },
    });
    if (!doc) {
      throw new NotFoundException(
        `Document ${docId} not found for employee ${employeeId}`,
      );
    }

    await this.db.document.update({
      where: { id: docId },
      data: {
        status: 'VERIFIED',
        reviewedBy: role,
        rejectionReason: null,
      },
    });

    return this.getEmployeeOrThrow(employeeId);
  }

  // UNDER_REVIEW -> DOCUMENTS_PENDING
  async rejectDocument(
    employeeId: string,
    docId: string,
    reason: string,
    role: string,
  ): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR']);

    if (employee.status !== 'UNDER_REVIEW') {
      throw new ConflictException(
        `Cannot reject document. Employee status is ${employee.status}`,
      );
    }

    const doc = await this.db.document.findFirst({
      where: { id: docId, employeeId },
    });
    if (!doc) {
      throw new NotFoundException(
        `Document ${docId} not found for employee ${employeeId}`,
      );
    }

    const updated = await this.db.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: docId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          reviewedBy: role,
        },
      });

      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: {
          status: 'DOCUMENTS_PENDING',
        },
        include: {
          documents: true,
          complianceForms: true,
          milestones: true,
        },
      });

      await this.auditLogService.createLog(
        {
          employeeId,
          fromStatus: employee.status,
          toStatus: 'DOCUMENTS_PENDING',
          actorId: role,
          actorRole: role as any,
          note: `Document rejected: ${doc.type}. Reason: ${reason}`,
        },
        tx,
      );

      return emp;
    });

    return mapEmployee(updated);
  }

  // UNDER_REVIEW -> COMPLIANCE_PROCESSING
  async approveReview(employeeId: string, role: string): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR']);

    if (employee.status !== 'UNDER_REVIEW') {
      throw new ConflictException(
        `Cannot approve review. Employee status is ${employee.status}`,
      );
    }

    const docs = await this.db.document.findMany({
      where: { employeeId },
    });

    const hasRejected = docs.some((d) => d.status === 'REJECTED');
    if (hasRejected) {
      throw new ConflictException(
        'Cannot approve review. Some documents are still rejected.',
      );
    }

    const allVerified = docs.every((d) => d.status === 'VERIFIED');
    if (!allVerified) {
      throw new ConflictException(
        'Cannot approve review. All documents must be verified.',
      );
    }

    await this.db.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: {
          status: 'MANAGER_REVIEW',
        },
      });

      await this.auditLogService.createLog(
        {
          employeeId,
          fromStatus: employee.status,
          toStatus: 'MANAGER_REVIEW',
          actorId: role,
          actorRole: role as any,
          note: 'HR approved all documents, routing to manager for review',
        },
        tx,
      );

      return emp;
    });

    return this.getEmployeeOrThrow(employeeId);
  }

  async getEmployeeDocuments(employeeId: string): Promise<Document[]> {
    const docs = await this.db.document.findMany({
      where: { employeeId },
    });
    return docs.map((doc) => ({
      id: doc.id,
      employeeId: doc.employeeId,
      type: doc.type as any,
      status: doc.status as any,
      extracted: doc.extracted as any,
      reviewedBy: doc.reviewedBy,
      rejectionReason: doc.rejectionReason,
      storagePath: doc.storagePath,
    }));
  }

  async curateForReview(employeeId: string) {
    const docs = await this.db.document.findMany({
      where: { employeeId },
    });

    return docs.map((doc) => {
      const extracted = (doc.extracted || {}) as Record<string, any>;
      let curatedFields: Record<string, any> = {};

      if (doc.type === 'AADHAAR') {
        curatedFields = {
          name: extracted.name || null,
          dob: extracted.dob || null,
          aadhaarNumber: extracted.aadhaarNumber || null,
          confidence: extracted.confidence ?? 0.95,
        };
      } else if (doc.type === 'PAN') {
        curatedFields = {
          name: extracted.name || null,
          panNumber: extracted.panNumber || null,
          confidence: extracted.confidence ?? 0.95,
        };
      } else {
        curatedFields = {
          documentType: doc.type,
          confidence: extracted.confidence ?? 0.95,
        };
      }

      return {
        id: doc.id,
        employeeId: doc.employeeId,
        type: doc.type,
        status: doc.status,
        reviewedBy: doc.reviewedBy,
        rejectionReason: doc.rejectionReason,
        storagePath: doc.storagePath,
        extracted: curatedFields,
      };
    });
  }

  // New upload flow handling multipart file
  async uploadDocumentFile(
    employeeId: string,
    docType: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<Document> {
    await this.getEmployeeOrThrow(employeeId);

    const storagePath = await this.storageService.uploadDocument(
      employeeId,
      docType,
      buffer,
      mimeType,
    );

    // Auto-extract metadata
    const extracted =
      await this.documentParserService.extractPdfMetadata(buffer);

    // Check if Document record already exists for this type
    let doc = await this.db.document.findFirst({
      where: { employeeId, type: docType as any },
    });

    if (doc) {
      doc = await this.db.document.update({
        where: { id: doc.id },
        data: {
          status: 'SUBMITTED',
          storagePath,
          extracted: extracted as any,
          reviewedBy: null,
          rejectionReason: null,
        },
      });
    } else {
      doc = await this.db.document.create({
        data: {
          id: crypto.randomUUID(),
          employeeId,
          type: docType as any,
          status: 'SUBMITTED',
          storagePath,
          extracted: extracted as any,
          reviewedBy: null,
          rejectionReason: null,
        },
      });
    }

    return {
      id: doc.id,
      employeeId: doc.employeeId,
      type: doc.type,
      status: doc.status,
      extracted: doc.extracted as any,
      reviewedBy: doc.reviewedBy,
      rejectionReason: doc.rejectionReason,
      storagePath: doc.storagePath,
    };
  }
}
