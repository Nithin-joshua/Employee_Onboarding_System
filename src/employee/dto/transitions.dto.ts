export class OpenPreboardingDto {
  role: string;
}

export class SubmitDocumentsDto {
  docs: {
    type: "AADHAAR" | "PAN" | "EDUCATION" | "RELIEVING_LETTER" | "BANK_PROOF" | "PHOTO";
  }[];
  role: string;
}

export class RejectDocumentDto {
  docId: string;
  reason: string;
  role: string;
}

export class ApproveReviewDto {
  role: string;
}

export class SignFormDto {
  role: string;
  signedBy: string;
}

export class CompleteMilestoneDto {
  type: "DAY1" | "30" | "60" | "90";
  role: string;
}
