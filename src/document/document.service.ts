import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { Document, Employee } from '../interfaces/types.interface';
import { MockOcrService } from './ocr.service';
import { ComplianceService } from '../compliance/compliance.service';

const REQUIRED_DOC_TYPES = ['AADHAAR', 'PAN', 'EDUCATION', 'RELIEVING_LETTER', 'BANK_PROOF', 'PHOTO'];

@Injectable()
export class DocumentService {
  constructor(
    private readonly db: DbService,
    private readonly ocrService: MockOcrService,
    private readonly complianceService: ComplianceService,
  ) {}

  private getEmployeeOrThrow(id: string): Employee {
    const employee = this.db.employees.find((e) => e.id === id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
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
    throw new ForbiddenException(`Role ${role} is not authorized for this action`);
  }

  // DOCUMENTS_PENDING -> DOCUMENTS_SUBMITTED
  submitDocuments(employeeId: string, docs: { type: string }[], role: string): Employee {
    const employee = this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['NEW_HIRE']);

    if (employee.status !== 'DOCUMENTS_PENDING') {
      throw new ConflictException(`Cannot submit documents. Employee status is ${employee.status}`);
    }

    // Require all 6 REQUIRED_DOC_TYPES present in the submitted list
    const submittedTypes = docs.map((d) => d.type);
    const hasAll = REQUIRED_DOC_TYPES.every((type) => submittedTypes.includes(type));
    if (!hasAll) {
      throw new ConflictException('All 6 required document types must be present');
    }

    // Clear existing docs for this employee and create new ones
    this.db.documents = this.db.documents.filter((d) => d.employeeId !== employeeId);
    employee.documentIds = [];

    for (const docType of REQUIRED_DOC_TYPES) {
      const newDoc: Document = {
        id: Math.random().toString(36).substring(7),
        employeeId: employeeId,
        type: docType as any,
        status: 'SUBMITTED',
        extracted: null,
        reviewedBy: null,
        rejectionReason: null,
      };
      this.db.documents.push(newDoc);
      employee.documentIds.push(newDoc.id);
    }

    employee.status = 'DOCUMENTS_SUBMITTED';
    employee.updatedAt = new Date().toISOString();
    return employee;
  }

  // DOCUMENTS_SUBMITTED -> UNDER_REVIEW
  async runExtraction(employeeId: string): Promise<Employee> {
    const employee = this.getEmployeeOrThrow(employeeId);
    // Called internally (SYSTEM role equivalent)

    if (employee.status !== 'DOCUMENTS_SUBMITTED') {
      throw new ConflictException(`Cannot run extraction. Employee status is ${employee.status}`);
    }

    const docs = this.db.documents.filter((d) => d.employeeId === employeeId);
    for (const doc of docs) {
      const result = await this.ocrService.extract(doc);
      doc.extracted = result.fields;
      doc.status = 'EXTRACTED';
    }

    employee.status = 'UNDER_REVIEW';
    employee.updatedAt = new Date().toISOString();
    return employee;
  }

  // Helper method for HR to verify documents
  verifyDocument(employeeId: string, docId: string, role: string): Employee {
    const employee = this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR']);

    if (employee.status !== 'UNDER_REVIEW') {
      throw new ConflictException(`Cannot verify document. Employee status is ${employee.status}`);
    }

    const doc = this.db.documents.find((d) => d.id === docId && d.employeeId === employeeId);
    if (!doc) {
      throw new NotFoundException(`Document ${docId} not found for employee ${employeeId}`);
    }

    doc.status = 'VERIFIED';
    doc.reviewedBy = role;
    doc.rejectionReason = null;
    return employee;
  }

  // UNDER_REVIEW -> DOCUMENTS_PENDING
  rejectDocument(employeeId: string, docId: string, reason: string, role: string): Employee {
    const employee = this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR']);

    if (employee.status !== 'UNDER_REVIEW') {
      throw new ConflictException(`Cannot reject document. Employee status is ${employee.status}`);
    }

    const doc = this.db.documents.find((d) => d.id === docId && d.employeeId === employeeId);
    if (!doc) {
      throw new NotFoundException(`Document ${docId} not found for employee ${employeeId}`);
    }

    doc.status = 'REJECTED';
    doc.rejectionReason = reason;
    doc.reviewedBy = role;

    employee.status = 'DOCUMENTS_PENDING';
    employee.updatedAt = new Date().toISOString();
    return employee;
  }

  // UNDER_REVIEW -> COMPLIANCE_PROCESSING
  approveReview(employeeId: string, role: string): Employee {
    const employee = this.getEmployeeOrThrow(employeeId);
    this.validateRole(role, ['HR']);

    if (employee.status !== 'UNDER_REVIEW') {
      throw new ConflictException(`Cannot approve review. Employee status is ${employee.status}`);
    }

    const docs = this.db.documents.filter((d) => d.employeeId === employeeId);

    // Negative test validation: "7. Negative test: call approveReview when a doc is still REJECTED → expect ConflictException."
    const hasRejected = docs.some((d) => d.status === 'REJECTED');
    if (hasRejected) {
      throw new ConflictException('Cannot approve review. Some documents are still rejected.');
    }

    // Requires all docs VERIFIED
    const allVerified = docs.every((d) => d.status === 'VERIFIED');
    if (!allVerified) {
      throw new ConflictException('Cannot approve review. All documents must be verified.');
    }

    employee.status = 'COMPLIANCE_PROCESSING';
    this.complianceService.generateForms(employeeId);
    employee.updatedAt = new Date().toISOString();
    return employee;
  }

  getEmployeeDocuments(employeeId: string): Document[] {
    return this.db.documents.filter((d) => d.employeeId === employeeId);
  }
}
