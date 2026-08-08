import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'Software Engineer', description: 'Job title' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

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
}
