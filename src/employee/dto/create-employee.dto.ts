import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John Doe', description: 'Name of the employee' })
  name: string;

  @ApiProperty({ example: '1995-05-15', description: 'Date of birth' })
  dob: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  phone: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({ example: 'Software Engineer', description: 'Job title' })
  title: string;

  @ApiProperty({ example: 'Engineering', description: 'Department' })
  department: string;

  @ApiProperty({ example: 'manager-uuid-here', description: 'ID of the manager' })
  managerId: string;

  @ApiProperty({ example: 80000, description: 'Annual salary' })
  salary: number;

  @ApiProperty({ example: '2026-09-01', description: 'Joining date' })
  joiningDate: string;

  @ApiProperty({ example: 'NEW_HIRE', description: 'Role of the employee' })
  role: string;
}
