import { Controller, Post, Body, Param, Get, Req, ForbiddenException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { SignFormDto } from '../employee/dto/transitions.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('employees/:employeeId')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

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
}
