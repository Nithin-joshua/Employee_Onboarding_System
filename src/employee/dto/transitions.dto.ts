export class OpenPreboardingDto {}

export class SubmitDocumentsDto {
  docs: {
    type: "AADHAAR" | "PAN" | "EDUCATION" | "RELIEVING_LETTER" | "BANK_PROOF" | "PHOTO";
  }[];
}

export class RejectDocumentDto {
  docId: string;
  reason: string;
}

export class ApproveReviewDto {}

export class SignFormDto {
  signedBy: string;
}

export class CompleteMilestoneDto {
  type: "DAY1" | "30" | "60" | "90";
}
