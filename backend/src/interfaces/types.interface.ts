import { Request } from 'express';

export type EmployeeStatus =
  | 'INVITED'
  | 'DOCUMENTS_PENDING'
  | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'MANAGER_REVIEW'
  | 'COMPLIANCE_PROCESSING'
  | 'PENDING_SIGNATURE'
  | 'DAY1_READY'
  | 'ACTIVE'
  | 'MILESTONE_30'
  | 'MILESTONE_60'
  | 'MILESTONE_90'
  | 'ONBOARDING_COMPLETE';

export interface PersonalDetails {
  name: string;
  dob?: string;
  phone?: string;
  email: string;
}

export interface JobDetails {
  title?: string;
  department?: string;
  managerId: string;
  salary?: number;
  joiningDate?: string;
}

export interface AadhaarExtractedData {
  aadhaarNumber: string;
  name: string;
  dob: string;
  gender: string;
}

export interface PanExtractedData {
  panNumber: string;
  name: string;
  fatherName?: string;
  dob: string;
}

export interface EducationExtractedData {
  degree: string;
  institution: string;
  yearOfPassing: string;
  percentageOrCgpa: string;
}

export interface RelievingLetterExtractedData {
  companyName: string;
  relievingDate: string;
  lastDesignation: string;
}

export interface BankProofExtractedData {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
}

export interface PhotoExtractedData {
  faceMatched: boolean;
  confidence: number;
}

export type ExtractedData =
  | AadhaarExtractedData
  | PanExtractedData
  | EducationExtractedData
  | RelievingLetterExtractedData
  | BankProofExtractedData
  | PhotoExtractedData;

export interface PfForm11Data {
  uan?: string;
  previousMemberId?: string;
  dateOfJoining?: string;
  signedBy: string;
}

export interface PfForm2Data {
  nomineeName: string;
  nomineeAddress: string;
  relationship: string;
  sharePercentage: number;
  signedBy: string;
}

export interface EsiForm1Data {
  familyDetails: Array<{ name: string; relationship: string; dob: string }>;
  signedBy: string;
}

export type ComplianceData = PfForm11Data | PfForm2Data | EsiForm1Data;

export interface Employee {
  id: string;
  status: EmployeeStatus;
  personal: PersonalDetails;
  job: JobDetails;
  documentIds: string[];
  complianceFormIds: string[];
  milestoneIds: string[];
  documents?: any[];
  complianceForms?: any[];
  milestones?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  employeeId: string;
  type:
    | 'AADHAAR'
    | 'PAN'
    | 'EDUCATION'
    | 'EDUCATION_10TH'
    | 'EDUCATION_2ND_PUC'
    | 'EDUCATION_DEGREE'
    | 'RELIEVING_LETTER'
    | 'BANK_PROOF'
    | 'PHOTO';
  status: 'PENDING' | 'SUBMITTED' | 'EXTRACTED' | 'VERIFIED' | 'REJECTED';
  extracted: Record<string, unknown> | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  storagePath: string | null;
}

export interface ComplianceForm {
  id: string;
  employeeId: string;
  type: 'PF_FORM11' | 'PF_FORM2' | 'ESI_FORM1';
  status:
    'NOT_APPLICABLE' | 'PENDING_GENERATION' | 'PENDING_SIGNATURE' | 'SIGNED';
  deadline: string;
  data: Record<string, unknown>;
}

export interface Milestone {
  id: string;
  employeeId: string;
  type: 'DAY1' | 'M30' | 'M60' | 'M90';
  status: 'PENDING' | 'DONE';
  dueDate: string;
  checklist: string[];
}

export interface AuditLog {
  id: string;
  employeeId: string;
  fromStatus: EmployeeStatus;
  toStatus: EmployeeStatus;
  actorId: string;
  actorRole: 'HR' | 'MANAGER' | 'NEW_HIRE' | 'SYSTEM';
  timestamp: string;
  note?: string;
}

export interface UserPayload {
  userId: string;
  email: string;
  role: 'HR' | 'MANAGER' | 'NEW_HIRE' | 'SYSTEM';
  employeeId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}

// Type Guards and Safe Validation/Casting functions
export function isPersonalDetails(value: unknown): value is PersonalDetails {
  return typeof value === 'object' && value !== null;
}

export function assertPersonalDetails(value: unknown): PersonalDetails {
  if (!isPersonalDetails(value)) {
    throw new Error('Invalid personal details format');
  }
  return value;
}

export function isJobDetails(value: unknown): value is JobDetails {
  return typeof value === 'object' && value !== null;
}

export function assertJobDetails(value: unknown): JobDetails {
  if (!isJobDetails(value)) {
    throw new Error('Invalid job details format');
  }
  return value;
}
