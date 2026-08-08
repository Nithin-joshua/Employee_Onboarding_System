import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AuditLogService } from '../db/audit-log.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Roles('HR', 'MANAGER')
  @ApiOperation({ summary: 'Verify the cryptographic integrity of the audit logs chain' })
  @ApiResponse({ status: 200, description: 'Return audit verification status.' })
  @Get('verify-integrity')
  async verifyIntegrity() {
    const result = await this.auditLogService.verifyChainIntegrity();
    return {
      success: !result.isTampered,
      ...result,
    };
  }
}
