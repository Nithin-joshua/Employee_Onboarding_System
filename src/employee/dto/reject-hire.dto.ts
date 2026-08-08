import { ApiProperty } from '@nestjs/swagger';

export class RejectHireDto {
  @ApiProperty({ example: 'Documents are unclear or invalid', description: 'Reason for rejecting the hire' })
  reason: string;
}
