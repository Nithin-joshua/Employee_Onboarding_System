import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { DbService } from '../db/db.service';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(private readonly dbService: DbService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health check details' })
  async getHealth() {
    let dbStatus = 'UP';
    try {
      await this.dbService.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'DOWN';
    }

    return {
      status: dbStatus === 'UP' ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      details: {
        database: dbStatus,
      },
    };
  }
}
