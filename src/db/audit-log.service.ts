import { Injectable } from '@nestjs/common';
import { DbService } from './db.service';
import { EmployeeStatus, Role, AuditLog } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AuditLogService {
  constructor(private readonly db: DbService) {}

  async createLog(
    data: {
      employeeId: string;
      fromStatus: EmployeeStatus;
      toStatus: EmployeeStatus;
      actorId: string;
      actorRole: Role;
      note?: string;
    },
    tx?: any
  ): Promise<AuditLog> {
    const runInTx = async (prismaTx: any) => {
      // Lock the AuditLog table to prevent race conditions from concurrent updates
      await prismaTx.$executeRawUnsafe('LOCK TABLE "AuditLog" IN EXCLUSIVE MODE');

      const latestLogs = await prismaTx.auditLog.findMany({
        orderBy: [
          { timestamp: 'desc' },
          { id: 'desc' },
        ],
        take: 1,
      });

      const latestLog = latestLogs[0];
      const previousHash = latestLog ? latestLog.currentHash : '0';

      const timestamp = new Date();
      const timestampStr = timestamp.toISOString();

      const eventData = {
        employeeId: data.employeeId,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        actorId: data.actorId,
        actorRole: data.actorRole,
        note: data.note || null,
      };

      const hashInput = previousHash + JSON.stringify(eventData) + timestampStr;
      const currentHash = crypto.createHash('sha256').update(hashInput).digest('hex');

      return await prismaTx.auditLog.create({
        data: {
          ...data,
          timestamp,
          previousHash,
          currentHash,
        },
      });
    };

    if (tx) {
      return await runInTx(tx);
    } else {
      return await this.db.$transaction(async (prismaTx) => {
        return await runInTx(prismaTx);
      });
    }
  }

  async verifyChainIntegrity(): Promise<{ isTampered: boolean; brokenIndex?: number }> {
    const logs = await this.db.auditLog.findMany({
      orderBy: [
        { timestamp: 'asc' },
        { id: 'asc' },
      ],
    });

    let expectedPreviousHash = '0';

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      if (log.previousHash !== expectedPreviousHash) {
        return { isTampered: true, brokenIndex: i };
      }

      const eventData = {
        employeeId: log.employeeId,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        actorId: log.actorId,
        actorRole: log.actorRole,
        note: log.note || null,
      };

      const timestampStr = new Date(log.timestamp).toISOString();
      const hashInput = log.previousHash + JSON.stringify(eventData) + timestampStr;
      const computedHash = crypto.createHash('sha256').update(hashInput).digest('hex');

      if (log.currentHash !== computedHash) {
        return { isTampered: true, brokenIndex: i };
      }

      expectedPreviousHash = log.currentHash;
    }

    return { isTampered: false };
  }
}
