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
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';
import { DocumentType, Role, Prisma } from '@prisma/client';

const MANDATORY_DOC_TYPES = [
  'AADHAAR',
  'PAN',
  'EDUCATION_10TH',
  'EDUCATION_2ND_PUC',
  'EDUCATION_DEGREE',
  'BANK_PROOF',
  'PHOTO',
];

const OPTIONAL_DOC_TYPES = ['RELIEVING_LETTER'];

const ALL_DOC_TYPES = [...MANDATORY_DOC_TYPES, ...OPTIONAL_DOC_TYPES];

@Injectable()
export class DocumentService {
  constructor(
    private readonly db: DbService,
    private readonly ocrService: OcrService,
    private readonly storageService: StorageService,
    private readonly complianceService: ComplianceService,
    private readonly documentParserService: DocumentParserService,
    private readonly auditLogService: AuditLogService,
    private readonly emailService: EmailService,
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

  // DOCUMENTS_PENDING / INVITED -> DOCUMENTS_SUBMITTED
  async submitDocuments(
    employeeId: string,
    docs: { type: string }[],
    role: string,
  ): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['NEW_HIRE']);

    if (
      employee.status !== 'REGISTERED' &&
      employee.status !== 'DOCUMENTS_PENDING' &&
      employee.status !== 'INVITED'
    ) {
      throw new ConflictException(
        `Cannot submit documents. Employee status is ${employee.status}`,
      );
    }

    const submittedTypes = docs.map((d) => d.type);
    const hasAll = MANDATORY_DOC_TYPES.every((type) =>
      submittedTypes.includes(type),
    );
    if (!hasAll) {
      throw new ConflictException(
        'All mandatory document types must be present',
      );
    }

    const updated = await this.db.$transaction(async (tx) => {
      for (const docType of ALL_DOC_TYPES) {
        const existing = await tx.document.findFirst({
          where: { employeeId, type: docType as DocumentType },
        });

        if (existing) {
          // Keep existing path and metadata, just set status to SUBMITTED
          await tx.document.update({
            where: { id: existing.id },
            data: {
              status: 'SUBMITTED',
            },
          });
        } else if (MANDATORY_DOC_TYPES.includes(docType)) {
          await tx.document.create({
            data: {
              id: crypto.randomUUID(),
              employeeId: employeeId,
              type: docType as DocumentType,
              status: 'SUBMITTED',
              extracted: undefined,
              reviewedBy: null,
              rejectionReason: null,
              storagePath: `${employeeId}/${docType.toUpperCase()}.pdf`,
            },
          });
        }
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

      let result: { fields: Record<string, unknown>; confidence: number };

      if (doc.type === 'BANK_PROOF') {
        result = {
          fields: {
            note: 'Bank details verification is performed manually by HR. OCR extraction skipped.',
          },
          confidence: 1.0,
        };
      } else if (storagePath.startsWith('uploads/')) {
        try {
          const decryptedBuffer =
            await this.storageService.downloadDocument(storagePath);
          let fields: Record<string, unknown> = {};
          let confidence = 1.0;

          if (
            process.env.NODE_ENV !== 'test' &&
            this.ocrService &&
            typeof this.ocrService.extractBuffer === 'function' &&
            (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)
          ) {
            const isEdu = [
              'EDUCATION',
              'EDUCATION_10TH',
              'EDUCATION_2ND_PUC',
              'EDUCATION_DEGREE',
            ].includes((doc.type || '').toUpperCase());

            try {
              const ocrRes = await this.ocrService.extractBuffer(
                decryptedBuffer,
                doc.type,
              );
              fields = ocrRes.fields;
              confidence = ocrRes.confidence;
            } catch {
              fields =
                await this.documentParserService.extractPdfMetadata(
                  decryptedBuffer,
                  ...(isEdu ? [doc.type] : []),
                );
              confidence = (fields.confidence as number) ?? 0.95;
            }
          } else {
            const isEdu = [
              'EDUCATION',
              'EDUCATION_10TH',
              'EDUCATION_2ND_PUC',
              'EDUCATION_DEGREE',
            ].includes((doc.type || '').toUpperCase());

            fields =
              await this.documentParserService.extractPdfMetadata(
                decryptedBuffer,
                ...(isEdu ? [doc.type] : []),
              );
            confidence = (fields.confidence as number) ?? 1.0;
          }

          result = {
            fields,
            confidence,
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
        const inputDoc: Document = {
          id: doc.id,
          employeeId: doc.employeeId,
          type: doc.type,
          status: doc.status,
          extracted: doc.extracted as Record<string, unknown> | null,
          reviewedBy: doc.reviewedBy,
          rejectionReason: doc.rejectionReason,
          storagePath,
        };
        result = await this.ocrService.extract(inputDoc);
      }

      await this.db.document.update({
        where: { id: doc.id },
        data: {
          extracted: {
            ...(result.fields as Record<string, any>),
            confidence: result.confidence,
          },
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

    const allowedStatuses = ['REGISTERED', 'DOCUMENTS_PENDING', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'MANAGER_REVIEW'];
    if (!allowedStatuses.includes(employee.status)) {
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

    await this.auditLogService.createLog({
      employeeId,
      fromStatus: employee.status,
      toStatus: employee.status,
      actorId: role,
      actorRole: role as Role,
      note: `HR verified document: ${doc.type}`,
    });

    return this.getEmployeeOrThrow(employeeId);
  }

  // HR rejects document -> transitions to DOCUMENTS_PENDING and sends email to candidate
  async rejectDocument(
    employeeId: string,
    docId: string,
    reason: string,
    role: string,
  ): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR']);

    const allowedStatuses = ['REGISTERED', 'DOCUMENTS_PENDING', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'MANAGER_REVIEW'];
    if (!allowedStatuses.includes(employee.status)) {
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
          lastRejectionReason: `Document rejected (${doc.type}): ${reason}`,
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
          actorRole: role as Role,
          note: `Document rejected: ${doc.type}. Reason: ${reason}`,
        },
        tx,
      );

      return emp;
    });

    // Send email notification to candidate asynchronously
    if (employee.personal && typeof employee.personal === 'object') {
      const personal = employee.personal as Record<string, any>;
      const candidateEmail = personal.email;
      const candidateName = personal.name || 'Candidate';
      if (candidateEmail) {
        this.emailService
          .sendDocumentRejectedEmail(candidateEmail, candidateName, doc.type, reason)
          .catch((err) =>
            console.error('[DocumentService] Failed to send document rejected email:', err),
          );
      }
    }

    return mapEmployee(updated);
  }

  // HR approves all documents -> routes candidate to MANAGER_REVIEW
  async approveReview(employeeId: string, role: string): Promise<Employee> {
    const employee = await this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR']);

    const allowedStatuses = ['REGISTERED', 'UNDER_REVIEW', 'DOCUMENTS_SUBMITTED', 'DOCUMENTS_PENDING'];
    if (!allowedStatuses.includes(employee.status)) {
      throw new ConflictException(
        `Cannot approve review. Employee status is ${employee.status}. It must be submitted, pending, or under review.`,
      );
    }

    const docs = await this.db.document.findMany({
      where: { employeeId },
    });

    const hasRejected = docs.some((d) => d.status === 'REJECTED');
    if (hasRejected) {
      throw new ConflictException(
        'Cannot approve review. Some documents are marked as rejected.',
      );
    }

    const allMandatoryVerified = MANDATORY_DOC_TYPES.every((mandatoryType) =>
      docs.some((d) => d.type === mandatoryType && d.status === 'VERIFIED'),
    );
    if (!allMandatoryVerified) {
      throw new ConflictException(
        'Cannot approve review. All 7 mandatory documents must be uploaded and verified by HR.',
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
          actorRole: role as Role,
          note: 'HR approved all documents, routing to manager for review',
        },
        tx,
      );

      return emp;
    });

    // Notify assigned manager via email if configured
    const managerId = (employee.job as any)?.managerId;
    if (managerId) {
      const cleanMid = String(managerId).replace(/^mgr_/, '').replace(/^mgr/, '');
      this.db.user
        .findFirst({
          where: {
            role: 'MANAGER',
            OR: [
              { employeeId: managerId },
              { employeeId: `mgr_${cleanMid}` },
              { email: managerId },
            ],
          },
        })
        .then((mgr) => {
          if (mgr?.email) {
            const candidateName = (employee.personal as any)?.name || 'New Hire';
            const jobTitle = (employee.job as any)?.title || 'Role';
            this.emailService
              .sendManagerReviewNotification(
                mgr.email,
                'Manager',
                candidateName,
                jobTitle,
                employeeId,
              )
              .catch((err) =>
                console.error('[DocumentService] Failed to notify manager:', err),
              );
          }
        })
        .catch(() => {});
    }

    return this.getEmployeeOrThrow(employeeId);
  }

  async getEmployeeDocuments(employeeId: string): Promise<any[]> {
    const docs = await this.db.document.findMany({
      where: { employeeId },
    });
    const result = [];
    for (const doc of docs) {
      const preview = await this.resolvePreviewUrl(doc);
      result.push({
        id: doc.id,
        employeeId: doc.employeeId,
        type: doc.type,
        status: doc.status,
        extracted: doc.extracted as Record<string, unknown> | null,
        reviewedBy: doc.reviewedBy,
        rejectionReason: doc.rejectionReason,
        storagePath: doc.storagePath,
        signedUrl: preview.signedUrl,
        isPdf: preview.isPdf,
        mimeType: preview.mimeType,
      });
    }
    return result;
  }

  async curateForReview(employeeId: string) {
    const docs = await this.db.document.findMany({
      where: { employeeId },
    });

    const result = [];
    for (const doc of docs) {
      const extracted = (doc.extracted || {}) as Record<string, unknown>;
      let curatedFields: Record<string, unknown> = {};

      if (doc.type === 'AADHAAR') {
        curatedFields = {
          name: extracted.name || null,
          dob: extracted.dob || null,
          aadhaarNumber: extracted.aadhaarNumber || null,
          confidence: extracted.confidence ?? 0.95,
        };
        if (extracted.gender !== undefined) curatedFields.gender = extracted.gender;
        if (extracted.address !== undefined) curatedFields.address = extracted.address;
      } else if (doc.type === 'PAN') {
        curatedFields = {
          name: extracted.name || null,
          panNumber: extracted.panNumber || null,
          confidence: extracted.confidence ?? 0.95,
        };
        if (extracted.dob !== undefined) curatedFields.dob = extracted.dob;
        if (extracted.fatherName !== undefined) curatedFields.fatherName = extracted.fatherName;
      } else {
        curatedFields = {
          documentType: doc.type,
          ...extracted,
          confidence: extracted.confidence ?? 0.95,
        };
      }

      const preview = await this.resolvePreviewUrl(doc);

      result.push({
        id: doc.id,
        employeeId: doc.employeeId,
        type: doc.type,
        status: doc.status,
        reviewedBy: doc.reviewedBy,
        rejectionReason: doc.rejectionReason,
        storagePath: doc.storagePath,
        extracted: curatedFields,
        signedUrl: preview.signedUrl,
        isPdf: preview.isPdf,
        mimeType: preview.mimeType,
      });
    }
    return result;
  }

  // New upload flow handling multipart file
  async uploadDocumentFile(
    employeeId: string,
    docType: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<any> {
    await this.getEmployeeOrThrow(employeeId);

    const storagePath = await this.storageService.uploadDocument(
      employeeId,
      docType,
      buffer,
      mimeType,
    );

    // Auto-extract metadata using Google Gemini AI OCR (with fallback to pdf-parse / regex)
    let extracted: Record<string, unknown> = {};
    if (docType === 'BANK_PROOF') {
      extracted = {
        note: 'Bank details verification is performed manually by HR. OCR extraction skipped.',
        confidence: 1.0,
      };
    } else if (
      process.env.NODE_ENV !== 'test' &&
      this.ocrService &&
      typeof this.ocrService.extractBuffer === 'function'
    ) {
      try {
        const ocrResult = await this.ocrService.extractBuffer(
          buffer,
          docType,
          mimeType,
        );
        extracted = {
          ...ocrResult.fields,
          confidence: ocrResult.confidence,
        };
      } catch (e) {
        console.warn(
          `[Auto-OCR Warning] OCR extraction failed, falling back to parser:`,
          e,
        );
        extracted = await this.documentParserService.extractPdfMetadata(buffer, docType);
      }
    } else {
      extracted = await this.documentParserService.extractPdfMetadata(buffer, docType);
    }

    // Check if Document record already exists for this type
    let doc = await this.db.document.findFirst({
      where: { employeeId, type: docType as DocumentType },
    });

    if (doc) {
      doc = await this.db.document.update({
        where: { id: doc.id },
        data: {
          status: 'SUBMITTED',
          storagePath,
          extracted: extracted as Prisma.InputJsonValue,
          reviewedBy: null,
          rejectionReason: null,
        },
      });
    } else {
      doc = await this.db.document.create({
        data: {
          id: crypto.randomUUID(),
          employeeId,
          type: docType as DocumentType,
          status: 'SUBMITTED',
          storagePath,
          extracted: extracted as Prisma.InputJsonValue,
          reviewedBy: null,
          rejectionReason: null,
        },
      });
    }

    const preview = await this.resolvePreviewUrl(doc);

    return {
      id: doc.id,
      employeeId: doc.employeeId,
      type: doc.type,
      status: doc.status,
      extracted: doc.extracted as Record<string, unknown> | null,
      reviewedBy: doc.reviewedBy,
      rejectionReason: doc.rejectionReason,
      storagePath: doc.storagePath,
      signedUrl: preview.signedUrl,
      isPdf: preview.isPdf,
      mimeType: preview.mimeType,
    };
  }

  private async resolvePreviewUrl(doc: {
    id: string;
    employeeId: string;
    storagePath: string | null;
  }): Promise<{ signedUrl: string | null; isPdf: boolean; mimeType: string }> {
    if (!doc.storagePath) {
      return { signedUrl: null, isPdf: true, mimeType: 'application/pdf' };
    }

    let isPdf = !doc.storagePath.match(/\.(png|jpg|jpeg|webp)$/i);
    let mimeType = isPdf ? 'application/pdf' : 'image/jpeg';
    if (doc.storagePath.toLowerCase().endsWith('.png')) mimeType = 'image/png';

    let signedUrl: string | null = null;
    const isSupabase =
      this.storageService &&
      typeof this.storageService.isSupabaseEnabled === 'function'
        ? this.storageService.isSupabaseEnabled()
        : process.env.STORAGE_PROVIDER === 'supabase';

    if (
      !doc.storagePath.startsWith('uploads/') &&
      isSupabase &&
      typeof this.storageService?.getSignedUrl === 'function'
    ) {
      try {
        signedUrl = await this.storageService.getSignedUrl(doc.storagePath);
      } catch (e) {
        console.warn(
          `Failed to get signed URL from Supabase for ${doc.storagePath}:`,
          e,
        );
      }
    }

    if (!signedUrl) {
      const baseUrl =
        process.env.BACKEND_PUBLIC_URL ||
        process.env.BACKEND_URL ||
        'http://127.0.0.1:3000';
      signedUrl = `${baseUrl}/employees/${doc.employeeId}/documents/${doc.id}/file`;
    }

    return { signedUrl, isPdf, mimeType };
  }

  async getDocumentFile(
    employeeId: string,
    docId: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const doc = await this.db.document.findFirst({
      where: { id: docId, employeeId },
    });
    if (!doc || !doc.storagePath) {
      throw new NotFoundException('Document file not found');
    }

    const buffer = await this.storageService.downloadDocument(doc.storagePath);
    let mimeType = 'application/pdf';
    if (buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF') {
      mimeType = 'application/pdf';
    } else if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      mimeType = 'image/jpeg';
    } else if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      mimeType = 'image/png';
    } else if (doc.storagePath.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    } else if (
      doc.storagePath.toLowerCase().endsWith('.jpg') ||
      doc.storagePath.toLowerCase().endsWith('.jpeg')
    ) {
      mimeType = 'image/jpeg';
    }

    return { buffer, mimeType };
  }
}
