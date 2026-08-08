import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ example: 'Software Engineer', description: 'Job title' })
  jobTitle: string;

  @ApiProperty({ example: 'Engineering', description: 'Department' })
  department: string;

  @ApiProperty({ example: 'manager-uuid-here', description: 'ID of the manager' })
  managerId: string;

  @ApiProperty({ example: 80000, description: 'Annual salary' })
  salary: number;

  @ApiProperty({ example: '2026-09-01', description: 'Joining date' })
  joiningDate: string;
}
