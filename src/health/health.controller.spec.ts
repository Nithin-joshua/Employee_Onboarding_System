import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DbService } from '../db/db.service';

describe('HealthController', () => {
  let healthController: HealthController;
  let dbServiceMock: any;

  beforeEach(async () => {
    dbServiceMock = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DbService, useValue: dbServiceMock }],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('should return status OK when database is UP', async () => {
    dbServiceMock.$queryRaw.mockResolvedValue([1]);

    const result = await healthController.getHealth();

    expect(dbServiceMock.$queryRaw).toHaveBeenCalled();
    expect(result.status).toBe('OK');
    expect(result.details.database).toBe('UP');
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeDefined();
    expect(result.memoryUsage).toBeDefined();
  });

  it('should return status ERROR when database is DOWN', async () => {
    dbServiceMock.$queryRaw.mockRejectedValue(new Error('DB Error'));

    const result = await healthController.getHealth();

    expect(dbServiceMock.$queryRaw).toHaveBeenCalled();
    expect(result.status).toBe('ERROR');
    expect(result.details.database).toBe('DOWN');
  });
});
