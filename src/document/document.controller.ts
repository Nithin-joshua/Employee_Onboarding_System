import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { DocumentService } from './document.service';
import { SubmitDocumentsDto, RejectDocumentDto, ApproveReviewDto } from '../employee/dto/transitions.dto';

@Controller('employees/:employeeId')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get('documents')
  getDocs(@Param('employeeId') employeeId: string) {
    return this.documentService.getEmployeeDocuments(employeeId);
  }

  @Post('submit-documents')
  submit(@Param('employeeId') employeeId: string, @Body() dto: SubmitDocumentsDto) {
    return this.documentService.submitDocuments(employeeId, dto.docs, dto.role);
  }

  @Post('run-extraction')
  runExtraction(@Param('employeeId') employeeId: string) {
    return this.documentService.runExtraction(employeeId);
  }

  @Post('verify-document')
  verify(
    @Param('employeeId') employeeId: string,
    @Body() dto: { docId: string; role: string },
  ) {
    return this.documentService.verifyDocument(employeeId, dto.docId, dto.role);
  }

  @Post('reject-document')
  reject(@Param('employeeId') employeeId: string, @Body() dto: RejectDocumentDto) {
    return this.documentService.rejectDocument(employeeId, dto.docId, dto.reason, dto.role);
  }

  @Post('approve-review')
  approve(@Param('employeeId') employeeId: string, @Body() dto: ApproveReviewDto) {
    return this.documentService.approveReview(employeeId, dto.role);
  }
}
