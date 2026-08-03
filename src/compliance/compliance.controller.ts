import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { SignFormDto } from '../employee/dto/transitions.dto';

@Controller('employees/:employeeId')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('compliance-forms')
  getForms(@Param('employeeId') employeeId: string) {
    return this.complianceService.getEmployeeForms(employeeId);
  }

  @Post('compute-compliance')
  compute(@Param('employeeId') employeeId: string) {
    return this.complianceService.computeCompliance(employeeId);
  }

  @Post('sign-form/:formId')
  sign(
    @Param('employeeId') employeeId: string,
    @Param('formId') formId: string,
    @Body() dto: SignFormDto,
  ) {
    return this.complianceService.signForm(employeeId, formId, dto.signedBy, dto.role);
  }
}
