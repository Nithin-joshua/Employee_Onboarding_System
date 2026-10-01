import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'Software Engineer', description: 'Job title' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @ApiProperty({ example: 'Engineering', description: 'Department' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({
    example: 'manager-uuid-here',
    description: 'ID of the manager',
  })
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

  @ApiProperty({
    example: 'candidate@example.com',
    description: 'Candidate email address(es) to send onboarding invitation to',
    required: false,
  })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: ['candidate1@example.com', 'candidate2@example.com'],
    description: 'List of candidate email addresses to invite',
    required: false,
  })
  @IsOptional()
  emails?: string[] | string;
}
