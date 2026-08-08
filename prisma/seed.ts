import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clear existing records
  await prisma.user.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.complianceForm.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.invitationCode.deleteMany({});

  const employeesFilePath = path.join(__dirname, '../fixtures/employees.json');
  const employeesContent = await fs.readFile(employeesFilePath, 'utf-8');
  const employees = JSON.parse(employeesContent);

  const docTypes = ['AADHAAR', 'PAN', 'EDUCATION', 'RELIEVING_LETTER', 'BANK_PROOF', 'PHOTO'];

  // Hash standard dev password
  const devPassword = 'password123';
  const hashedDevPassword = await bcrypt.hash(devPassword, 10);

  // Seed non-employee users
  const hrUser = await prisma.user.create({
    data: {
      email: 'hr@example.com',
      passwordHash: hashedDevPassword,
      role: 'HR',
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      passwordHash: hashedDevPassword,
      role: 'MANAGER',
      employeeId: 'mgr_123',
    },
  });

  // Seed InvitationCode
  const seededInvitation = await prisma.invitationCode.create({
    data: {
      code: 'WELCOME2026',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      managerId: 'mgr_123',
      salary: 60000,
      joiningDate: new Date('2026-10-01'),
    },
  });

  for (const emp of employees) {
    const createdEmployee = await prisma.employee.create({
      data: {
        id: emp.id,
        status: emp.status,
        personal: emp.personal,
        job: emp.job,
        createdAt: new Date(emp.createdAt),
        updatedAt: new Date(emp.updatedAt),
      },
    });

    // Create 6 mock documents for each employee
    for (const docType of docTypes) {
      // Read OCR mock fields
      const ocrPath = path.join(__dirname, `../fixtures/ocr-mock/${docType}.json`);
      let extracted = null;
      try {
        const ocrContent = await fs.readFile(ocrPath, 'utf-8');
        const ocrData = JSON.parse(ocrContent);
        extracted = ocrData.fields;
      } catch (err) {
        // Fallback
        extracted = { mockKey: 'mockValue' };
      }

      await prisma.document.create({
        data: {
          id: `doc_${emp.id}_${docType.toLowerCase()}`,
          employeeId: emp.id,
          type: docType as any,
          status: 'EXTRACTED', // Seed them as extracted/ready for review
          extracted: extracted,
          reviewedBy: null,
          rejectionReason: null,
          storagePath: `employee-documents/${emp.id}/${docType}.pdf`,
        },
      });
    }

    // Seed NEW_HIRE user linked to employee
    await prisma.user.create({
      data: {
        email: emp.personal.email,
        passwordHash: hashedDevPassword,
        role: 'NEW_HIRE',
        employeeId: emp.id,
      },
    });
  }

  console.log('Database seeded successfully.');

  if (process.env.NODE_ENV !== 'production') {
    console.log('\n--- Seeded Dev Credentials ---');
    console.log(`HR:      ${hrUser.email} / ${devPassword}`);
    console.log(`Manager: ${managerUser.email} / ${devPassword}`);
    employees.forEach((emp: any) => {
      console.log(`NewHire (${emp.id}): ${emp.personal.email} / ${devPassword}`);
    });
    console.log('-------------------------------\n');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
