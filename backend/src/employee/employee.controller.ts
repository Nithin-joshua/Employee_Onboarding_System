import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { Roles } from '../auth/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AbacOwnershipGuard } from '../common/guards/abac-ownership.guard';
import { AuditLogService } from '../db/audit-log.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { EmployeeStatusListener } from './employee-status.listener';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { AuthenticatedRequest } from '../interfaces/types.interface';

@ApiTags('Employee')
@ApiBearerAuth()
@Controller()
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly auditLogService: AuditLogService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Roles('HR', 'MANAGER')
  @ApiOperation({ summary: 'List all employees' })
  @ApiResponse({ status: 200, description: 'Return all employees.' })
  @Get('employees')
  findAll() {
    return this.employeeService.listEmployees();
  }

  @Roles('HR')
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({
    status: 201,
    description: 'The employee has been successfully created.',
    type: CreateEmployeeDto,
  })
  @Post('employees')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(dto);
  }

  @Roles('HR', 'MANAGER', 'NEW_HIRE')
  @UseGuards(AbacOwnershipGuard)
  @ApiOperation({ summary: 'Get employee details by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Return employee details.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  @Get('employees/:id')
  findOne(@Param('id') id: string) {
    return this.employeeService.getEmployee(id);
  }

  @Roles('NEW_HIRE')
  @UseGuards(AbacOwnershipGuard)
  @ApiOperation({ summary: 'Open preboarding link for a new hire' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Preboarding link opened and status updated.',
  })
  @Post('employees/:id/open-preboarding')
  openPreboarding(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.employeeService.openPreboardingLink(id, req.user.role);
  }

  @Roles('HR', 'MANAGER')
  @ApiOperation({
    summary: 'Stream live employee status changes in real time via SSE',
  })
  @Sse('employee/live-status')
  liveStatus(): Observable<MessageEvent> {
    return EmployeeStatusListener.statusChange$.pipe(
      map((data) => ({
        data,
      })),
    );
  }
}
