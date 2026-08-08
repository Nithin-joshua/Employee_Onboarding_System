/**
 * Prisma Database Seed
 * ====================
 * Populates the database with deterministic development data.
 *
 * Usage:
 *   npx prisma db seed
 *
 * This script is idempotent — running it multiple times will not create
 * duplicate records. It uses upsert operations throughout.
 *
 * Configuration (all optional, via .env):
 *   SEED_DEV_PASSWORD    Password assigned to all seeded users (default: random, printed once)
 *   SEED_INVITATION_CODE Invitation code created for new-hire registration (default: WELCOME2026)
 *
 * Data files (seed-only, never loaded by runtime code):
 *   prisma/seed-data/employees.json   — employee records to seed
 *   prisma/seed-data/ocr/<TYPE>.json  — pre-extracted OCR data per document type
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const DOC_TYPES = [
  'AADHAAR',
  'PAN',
  'EDUCATION',
  'RELIEVING_LETTER',
  'BANK_PROOF',
  'PHOTO',
] as const;

async function readSeedJson<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(__dirname, relativePath);
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    throw new Error(
      `Seed data file not found or invalid JSON: "${fullPath}". ` +
        `Original error: ${(err as Error).message}`,
    );
  }
}

async function loadOcrSeedData(
  docType: string,
): Promise<{ fields: Record<string, unknown>; confidence: number }> {
  try {
    const data = await readSeedJson<{
      fields: Record<string, unknown>;
      confidence: number;
    }>(`seed-data/ocr/${docType}.json`);
    return { fields: data.fields, confidence: data.confidence ?? 0.95 };
  } catch {
    // If OCR seed data is missing, use minimal placeholder fields
    return { fields: { documentType: docType, seeded: true }, confidence: 0.9 };
  }
}

async function main() {
  // ── Dev password ────────────────────────────────────────────────────────────
  const devPassword =
    process.env.SEED_DEV_PASSWORD ||
    (process.env.NODE_ENV !== 'production'
      ? crypto.randomBytes(8).toString('hex')
      : (() => {
          throw new Error(
            'SEED_DEV_PASSWORD must be set when seeding in production.',
          );
        })());

  const hashedDevPassword = await bcrypt.hash(devPassword, 10);

  // ── Invitation code ──────────────────────────────────────────────────────────
  const invitationCode = process.env.SEED_INVITATION_CODE || 'WELCOME2026';

  // ── Non-employee users ───────────────────────────────────────────────────────
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@example.com' },
    update: { passwordHash: hashedDevPassword, role: 'HR' },
    create: {
      email: 'hr@example.com',
      passwordHash: hashedDevPassword,
      role: 'HR',
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: { passwordHash: hashedDevPassword, role: 'MANAGER' },
    create: {
      email: 'manager@example.com',
      passwordHash: hashedDevPassword,
      role: 'MANAGER',
      employeeId: 'mgr_123',
    },
  });

  // ── Invitation code ──────────────────────────────────────────────────────────
  await prisma.invitationCode.upsert({
    where: { code: invitationCode },
    update: {},
    create: {
      code: invitationCode,
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      managerId: 'mgr_123',
      salary: 60000,
      joiningDate: new Date('2026-10-01'),
      used: false,
    },
  });

  // ── Employees ────────────────────────────────────────────────────────────────
  type EmployeeSeedRecord = {
    id: string;
    personal: Record<string, unknown>;
    job: Record<string, unknown>;
  };

  const employees = await readSeedJson<EmployeeSeedRecord[]>(
    'seed-data/employees.json',
  );

  for (const emp of employees) {
    // Upsert employee record
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        personal: emp.personal as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        job: emp.job as any,
      },
      create: {
        id: emp.id,
        status: 'INVITED',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        personal: emp.personal as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        job: emp.job as any,
      },
    });

    // Upsert documents (one per type) with pre-extracted OCR seed data
    for (const docType of DOC_TYPES) {
      const { fields, confidence } = await loadOcrSeedData(docType);
      const docId = `doc_${emp.id}_${docType.toLowerCase()}`;

      // Check if doc exists; upsert by composite (employeeId + type) not supported
      // so we use the stable deterministic id
      const existing = await prisma.document.findUnique({ where: { id: docId } });
      if (!existing) {
        await prisma.document.create({
          data: {
            id: docId,
            employeeId: emp.id,
            type: docType as any,
            status: 'EXTRACTED',
            extracted: { ...fields, confidence } as any,
            reviewedBy: null,
            rejectionReason: null,
            storagePath: `seed/${emp.id}/${docType}.pdf`,
          },
        });
      }
    }

    // Upsert user linked to employee
    const empEmail = (emp.personal as any).email as string;
    await prisma.user.upsert({
      where: { email: empEmail },
      update: { passwordHash: hashedDevPassword },
      create: {
        email: empEmail,
        passwordHash: hashedDevPassword,
        role: 'NEW_HIRE',
        employeeId: emp.id,
      },
    });
  }

  console.log('\n✅ Database seeded successfully.\n');

  if (process.env.NODE_ENV !== 'production') {
    console.log('─── Seeded Dev Credentials ─────────────────────────────────');
    console.log(`HR:       hr@example.com / ${devPassword}`);
    console.log(`Manager:  manager@example.com / ${devPassword}`);
    employees.forEach((emp) => {
      const email = (emp.personal as any).email;
      console.log(`NewHire (${emp.id}): ${email} / ${devPassword}`);
    });
    console.log(`Invitation Code: ${invitationCode}`);
    console.log('────────────────────────────────────────────────────────────\n');
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
