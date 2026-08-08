import { ApiProperty } from '@nestjs/swagger';

export class OpenPreboardingDto {}

export class DocumentUploadItem {
  @ApiProperty({
    enum: ["AADHAAR", "PAN", "EDUCATION", "RELIEVING_LETTER", "BANK_PROOF", "PHOTO"],
    description: 'Type of the document being submitted',
  })
  type: "AADHAAR" | "PAN" | "EDUCATION" | "RELIEVING_LETTER" | "BANK_PROOF" | "PHOTO";
}

export class SubmitDocumentsDto {
  @ApiProperty({ type: [DocumentUploadItem], description: 'List of documents being submitted' })
  docs: DocumentUploadItem[];
}

export class RejectDocumentDto {
  @ApiProperty({ example: 'doc-uuid-here', description: 'ID of the document to reject' })
  docId: string;

  @ApiProperty({ example: 'Illegible text', description: 'Reason for rejection' })
  reason: string;
}

export class ApproveReviewDto {}

export class SignFormDto {
  @ApiProperty({ example: 'John Doe', description: 'Signature of the user' })
  signedBy: string;
}

export class CompleteMilestoneDto {
  @ApiProperty({
    enum: ["DAY1", "30", "60", "90"],
    description: 'Type of onboarding milestone',
  })
  type: "DAY1" | "30" | "60" | "90";
}
