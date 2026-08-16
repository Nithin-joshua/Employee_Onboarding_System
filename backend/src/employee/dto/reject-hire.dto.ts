import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectHireDto {
  @ApiProperty({
    example: 'Documents are unclear or invalid',
    description: 'Reason for rejecting the hire',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
