export type EmployeeStatus =
  | "INVITED" | "DOCUMENTS_PENDING" | "DOCUMENTS_SUBMITTED" | "UNDER_REVIEW"
  | "COMPLIANCE_PROCESSING" | "PENDING_SIGNATURE" | "DAY1_READY" | "ACTIVE"
  | "MILESTONE_30" | "MILESTONE_60" | "MILESTONE_90" | "ONBOARDING_COMPLETE";

export interface Employee {
  id: string;
  status: EmployeeStatus;
  personal: { name: string; dob: string; phone: string; email: string };
  job: { title: string; department: string; managerId: string; salary: number; joiningDate: string };
  documentIds: string[];
  complianceFormIds: string[];
  milestoneIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  employeeId: string;
  type: "AADHAAR" | "PAN" | "EDUCATION" | "RELIEVING_LETTER" | "BANK_PROOF" | "PHOTO";
  status: "PENDING" | "SUBMITTED" | "EXTRACTED" | "VERIFIED" | "REJECTED";
  extracted: Record<string, unknown> | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  storagePath: string | null;
}

export interface ComplianceForm {
  id: string;
  employeeId: string;
  type: "PF_FORM11" | "PF_FORM2" | "ESI_FORM1";
  status: "NOT_APPLICABLE" | "PENDING_GENERATION" | "PENDING_SIGNATURE" | "SIGNED";
  deadline: string;
  data: Record<string, unknown>;
}

export interface Milestone {
  id: string;
  employeeId: string;
  type: "DAY1" | "30" | "60" | "90";
  status: "PENDING" | "DONE";
  dueDate: string;
  checklist: string[];
}

export interface AuditLog {
  id: string;
  employeeId: string;
  fromStatus: EmployeeStatus;
  toStatus: EmployeeStatus;
  actorId: string;
  actorRole: "HR" | "MANAGER" | "NEW_HIRE" | "SYSTEM";
  timestamp: string;
  note?: string;
}

