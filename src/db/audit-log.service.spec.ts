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

  it('should support createLog running inside a passed transaction tx client', async () => {
    await db.$transaction(async (tx) => {
      const log = await service.createLog(
        {
          employeeId: 'emp-tx',
          fromStatus: 'INVITED',
          toStatus: 'DOCUMENTS_PENDING',
          actorId: 'hr-1',
          actorRole: 'HR',
          note: 'Log within tx',
        },
        tx,
      );
      expect(log.id).toBeDefined();
      expect(log.employeeId).toBe('emp-tx');
    });
  });

  it('should detect mismatched previousHash and verify chain integrity with count', async () => {
    // 1. Create a valid chain of 2 logs
    await service.createLog({
      employeeId: 'emp-3',
      fromStatus: 'REGISTERED',
      toStatus: 'INVITED',
      actorId: 'hr-1',
      actorRole: 'HR',
    });

    const log2 = await service.createLog({
      employeeId: 'emp-3',
      fromStatus: 'INVITED',
      toStatus: 'DOCUMENTS_PENDING',
      actorId: 'hr-1',
      actorRole: 'HR',
    });

    // Verify valid chain with count
    const validResult = await service.verifyChainIntegrityWithCount();
    expect(validResult.isValid).toBe(true);
    expect(validResult.totalLogsVerified).toBe(2);

    // 2. Corrupt previousHash of log2
    await db.auditLog.update({
      where: { id: log2.id },
      data: { previousHash: 'mismatched-hash-value' },
    });

    // Verify invalid chain (previousHash mismatch)
    const invalidResult = await service.verifyChainIntegrityWithCount();
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.isTampered).toBe(true);
    expect(invalidResult.brokenIndex).toBe(1);
  });
});
