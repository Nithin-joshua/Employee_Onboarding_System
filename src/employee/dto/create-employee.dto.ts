import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John Doe', description: 'Name of the employee' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '1995-05-15', description: 'Date of birth' })
  @IsString()
  @IsNotEmpty()
  dob: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Software Engineer', description: 'Job title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Engineering', description: 'Department' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ example: 'manager-uuid-here', description: 'ID of the manager' })
  @IsString()
  @IsNotEmpty()
  managerId: string;

  @ApiProperty({ example: 80000, description: 'Annual salary' })
  @IsNumber()
  salary: number;

  @ApiProperty({ example: '2026-09-01', description: 'Joining date' })
  @IsString()
  @IsNotEmpty()
  joiningDate: string;

  @ApiProperty({ example: 'NEW_HIRE', description: 'Role of the employee' })
  @IsString()
  @IsOptional()
  role: string;
}
