import { Controller, Post, Get, Body, Param, Req } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Roles('HR', 'MANAGER')
  @Get()
  findAll() {
    return this.employeeService.listEmployees();
  }

  @Roles('HR')
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(dto);
  }

  @Roles('HR', 'MANAGER', 'NEW_HIRE')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeService.getEmployee(id);
  }

  @Roles('NEW_HIRE')
  @Post(':id/open-preboarding')
  openPreboarding(@Param('id') id: string, @Req() req: any) {
    return this.employeeService.openPreboardingLink(id, req.user.role);
  }
}
