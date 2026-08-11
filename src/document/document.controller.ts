import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import {
  SubmitDocumentsDto,
  RejectDocumentDto,
} from '../employee/dto/transitions.dto';
import { Roles } from '../auth/roles.decorator';
import { AbacOwnershipGuard } from '../common/guards/abac-ownership.guard';
import type { AuthenticatedRequest } from '../interfaces/types.interface';

interface UploadedFileInterface {
  buffer: Buffer;
  mimetype: string;
}

@UseGuards(AbacOwnershipGuard)
@Controller('employees/:employeeId')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Roles('HR', 'MANAGER', 'NEW_HIRE')
  @Get('documents')
  getDocs(@Param('employeeId') employeeId: string) {
    return this.documentService.getEmployeeDocuments(employeeId);
  }

  @Roles('HR', 'MANAGER')
  @Get('documents/review')
  getDocsForReview(@Param('employeeId') employeeId: string) {
    return this.documentService.curateForReview(employeeId);
  }

  @Roles('NEW_HIRE')
  @Post('submit-documents')
  submit(
    @Param('employeeId') employeeId: string,
    @Body() dto: SubmitDocumentsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentService.submitDocuments(
      employeeId,
      dto.docs,
      req.user.role,
    );
  }

  @Roles('HR', 'NEW_HIRE', 'SYSTEM') // extraction might be called by system, allow HR/NEW_HIRE/SYSTEM
  @Post('run-extraction')
  runExtraction(@Param('employeeId') employeeId: string) {
    return this.documentService.runExtraction(employeeId);
  }

  @Roles('HR')
  @Post('verify-document')
  verify(
    @Param('employeeId') employeeId: string,
    @Body() dto: { docId: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentService.verifyDocument(
      employeeId,
      dto.docId,
      req.user.role,
    );
  }

  @Roles('HR')
  @Post('reject-document')
  reject(
    @Param('employeeId') employeeId: string,
    @Body() dto: RejectDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentService.rejectDocument(
      employeeId,
      dto.docId,
      dto.reason,
      req.user.role,
    );
  }

  @Roles('HR')
  @Post('approve-review')
  approve(
    @Param('employeeId') employeeId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentService.approveReview(employeeId, req.user.role);
  }

  @Roles('NEW_HIRE', 'HR')
  @Post('documents/:docType/upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('employeeId') employeeId: string,
    @Param('docType') docType: string,
    @UploadedFile() file: UploadedFileInterface,
  ) {
    console.log(`[Upload Request] employeeId: ${employeeId}, docType: ${docType}, file exists: ${!!file}`);
    if (file) {
      console.log(`[Upload Request] file size: ${file.buffer?.length} bytes, mimetype: ${file.mimetype}`);
    }
    return this.documentService.uploadDocumentFile(
      employeeId,
      docType,
      file.buffer,
      file.mimetype,
    );
  }
}
