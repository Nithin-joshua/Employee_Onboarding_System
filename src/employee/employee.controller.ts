import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { OpenPreboardingDto } from './dto/transitions.dto';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeService.getEmployee(id);
  }

  @Post(':id/open-preboarding')
  openPreboarding(@Param('id') id: string, @Body() dto: OpenPreboardingDto) {
    return this.employeeService.openPreboardingLink(id, dto.role);
  }
}
