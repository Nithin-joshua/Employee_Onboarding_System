import { Controller, Post, Body, Param, Get, Req, ForbiddenException, Res, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { SignFormDto } from '../employee/dto/transitions.dto';
import { Roles } from '../auth/roles.decorator';
import { PdfGeneratorService } from '../employee/pdf-generator.service';
import { EmployeeService } from '../employee/employee.service';
import { AbacOwnershipGuard } from '../common/guards/abac-ownership.guard';
import type { Response } from 'express';

@UseGuards(AbacOwnershipGuard)
@Controller('employees/:employeeId')
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Roles('HR', 'MANAGER', 'NEW_HIRE')
  @Get('compliance-forms')
  getDocs(@Param('employeeId') employeeId: string) {
    return this.complianceService.getEmployeeForms(employeeId);
  }

  @Roles('HR', 'NEW_HIRE', 'SYSTEM')
  @Post('compute-compliance')
  compute(@Param('employeeId') employeeId: string) {
    return this.complianceService.computeCompliance(employeeId);
  }

  @Roles('NEW_HIRE', 'HR')
  @Post('sign-form/:formId')
  sign(
    @Param('employeeId') employeeId: string,
    @Param('formId') formId: string,
    @Body() dto: SignFormDto,
    @Req() req: any,
  ) {
    // For signForm's "own form" check specifically: compare req.user.employeeId against the target Employee.id
    if (req.user.role === 'NEW_HIRE' && req.user.employeeId !== employeeId) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.complianceService.signForm(employeeId, formId, dto.signedBy, req.user.role);
  }

  @Roles('NEW_HIRE', 'HR', 'MANAGER')
  @Get('download-pdf/:formId')
  async downloadPdf(
    @Param('employeeId') employeeId: string,
    @Param('formId') formId: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    if (req.user.role === 'NEW_HIRE' && req.user.employeeId !== employeeId) {
      throw new ForbiddenException('Forbidden resource');
    }
    const employee = await this.employeeService.getEmployee(employeeId);
    
    // Prepare candidate info
    const personal = employee.personal as any;
    const job = employee.job as any;
    const candidateInfo = {
      name: personal.name,
      dob: personal.dob,
      phone: personal.phone,
      email: personal.email,
      title: job.title,
      department: job.department,
      joiningDate: job.joiningDate,
    };

    const forms = await this.complianceService.getEmployeeForms(employeeId);
    const form = forms.find(f => f.id === formId);
    const formType = form ? form.type : 'STATUTORY_FORM';

    const pdfBuffer = await this.pdfGeneratorService.generateFormPDF(formType, candidateInfo);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${formType}_${employeeId}.pdf`);
    res.end(pdfBuffer);
  }
}
