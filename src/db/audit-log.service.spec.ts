import { Test, TestingModule } from '@nestjs/testing';
import { DbModule } from './db.module';
import { AuditLogService } from './audit-log.service';
import { DbService } from './db.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let db: DbService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DbModule],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    db = module.get<DbService>(DbService);
  });

  beforeEach(async () => {
    // Clear audit logs before each test
    await db.auditLog.deleteMany({});
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate audit logs with correct hashes and verify chain integrity', async () => {
    const log1 = await service.createLog({
      employeeId: 'emp-1',
      fromStatus: 'INVITED',
      toStatus: 'DOCUMENTS_PENDING',
      actorId: 'hr-1',
      actorRole: 'HR',
      note: 'First audit log',
    });

    expect(log1.previousHash).toBe('0');
    expect(log1.currentHash).toBeDefined();
    expect(log1.currentHash.length).toBe(64); // SHA-256 hex length

    const log2 = await service.createLog({
      employeeId: 'emp-1',
      fromStatus: 'DOCUMENTS_PENDING',
      toStatus: 'UNDER_REVIEW',
      actorId: 'emp-1',
      actorRole: 'NEW_HIRE',
      note: 'Second audit log',
    });

    expect(log2.previousHash).toBe(log1.currentHash);
    expect(log2.currentHash).toBeDefined();

    // Verify initial chain integrity
    const integrityBefore = await service.verifyChainIntegrity();
    expect(integrityBefore.isTampered).toBe(false);

    // Corrupt log2 by changing its note directly in the database
    await db.auditLog.update({
      where: { id: log2.id },
      data: { note: 'Tampered note!' },
    });

    // Verify integrity should detect tampering
    const integrityAfter = await service.verifyChainIntegrity();
    expect(integrityAfter.isTampered).toBe(true);
    expect(integrityAfter.brokenIndex).toBe(1); // Second element (index 1) is broken
  });
});
