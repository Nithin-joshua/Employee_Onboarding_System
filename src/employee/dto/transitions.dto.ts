import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenPreboardingDto {}

export class DocumentUploadItem {
  @ApiProperty({
    enum: ["AADHAAR", "PAN", "EDUCATION", "RELIEVING_LETTER", "BANK_PROOF", "PHOTO"],
    description: 'Type of the document being submitted',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["AADHAAR", "PAN", "EDUCATION", "RELIEVING_LETTER", "BANK_PROOF", "PHOTO"])
  type: "AADHAAR" | "PAN" | "EDUCATION" | "RELIEVING_LETTER" | "BANK_PROOF" | "PHOTO";
}

export class SubmitDocumentsDto {
  @ApiProperty({ type: [DocumentUploadItem], description: 'List of documents being submitted' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentUploadItem)
  docs: DocumentUploadItem[];
}

export class RejectDocumentDto {
  @ApiProperty({ example: 'doc-uuid-here', description: 'ID of the document to reject' })
  @IsString()
  @IsNotEmpty()
  docId: string;

  @ApiProperty({ example: 'Illegible text', description: 'Reason for rejection' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ApproveReviewDto {}

export class SignFormDto {
  @ApiProperty({ example: 'John Doe', description: 'Signature of the user' })
  @IsString()
  @IsNotEmpty()
  signedBy: string;
}

export class CompleteMilestoneDto {
  @ApiProperty({
    enum: ["DAY1", "30", "60", "90"],
    description: 'Type of onboarding milestone',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["DAY1", "30", "60", "90"])
  type: "DAY1" | "30" | "60" | "90";
}
