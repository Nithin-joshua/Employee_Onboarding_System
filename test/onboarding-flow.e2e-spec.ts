import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DbService } from '../src/db/db.service';
import { StorageService } from '../src/document/storage.service';
import { OcrService } from '../src/document/ocr.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { ComplianceRuleService } from '../src/employee/compliance-rule.service';
import { EmailService } from '../src/email/email.service';

describe('Employee Onboarding Workflow (e2e)', () => {
  let app: INestApplication<App>;
  let db: DbService;
  let mockEmployees: any[];
  let hrToken: string;
  let managerToken: string;
  let newHireToken: string;
  let otherNewHireToken: string; // for own-form mismatch negative check

  beforeAll(async () => {
    const employeesPath = path.join(
      process.cwd(),
      'fixtures',
      'employees.json',
    );
    const content = await fs.readFile(employeesPath, 'utf-8');
    mockEmployees = JSON.parse(content);
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue({
        uploadDocument: jest.fn().mockResolvedValue('mock-path'),
        getSignedUrl: jest
          .fn()
          .mockResolvedValue('https://mock-signed-url.com/doc.pdf'),
      })
      .overrideProvider(OcrService)
      .useValue({
        extract: jest.fn().mockImplementation(async (doc: any) => {
          const filePath = path.join(
            process.cwd(),
            'fixtures',
            'ocr-mock',
            `${doc.type}.json`,
          );
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          return {
            fields: data.fields,
            confidence: data.confidence,
          };
        }),
      })
      .overrideProvider(EmailService)
      .useValue({
        sendOtp: jest.fn().mockResolvedValue(undefined),
        sendHireConfirmation: jest.fn().mockResolvedValue(undefined),
        sendOnboardingInvite: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = moduleFixture.get<DbService>(DbService);
    await db.clear();

    // Re-seed default compliance rules as db.clear() might clear them or app.init() ran before db.clear()
    const complianceRuleService = moduleFixture.get<ComplianceRuleService>(
      ComplianceRuleService,
    );
    // Call private seed method via any cast
    await (complianceRuleService as any).seedDefaultRules();

    // Create users & hash passwords in DB for authentication
    const hashedPw = await bcrypt.hash('password123', 10);
    await db.user.createMany({
      data: [
        { email: 'hr@example.com', passwordHash: hashedPw, role: 'HR' },
        {
          email: 'manager@example.com',
          passwordHash: hashedPw,
          role: 'MANAGER',
          employeeId: 'mgr_123',
        },
        {
          email: 'alice@example.com',
          passwordHash: hashedPw,
          role: 'NEW_HIRE',
          employeeId: 'emp_low_salary',
        },
        {
          email: 'bob@example.com',
          passwordHash: hashedPw,
          role: 'NEW_HIRE',
          employeeId: 'emp_high_salary',
        },
      ],
    });

    // Retrieve tokens
    let loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'hr@example.com', pass: 'password123' });
    hrToken = loginRes.body.access_token;

    loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@example.com', pass: 'password123' });
    managerToken = loginRes.body.access_token;

    loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'alice@example.com', pass: 'password123' });
    newHireToken = loginRes.body.access_token;

    loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'bob@example.com', pass: 'password123' });
    otherNewHireToken = loginRes.body.access_token;
  });

  afterEach(async () => {
    await app.close();
  });

  it('Happy Path - salary < 21000 (ESI and PF applicable)', async () => {
    // 1. Seed employee from fixture
    const empFixture = JSON.parse(
      JSON.stringify(mockEmployees.find((e) => e.id === 'emp_low_salary')),
    );
    await db.employee.create({
      data: {
        id: empFixture.id,
        status: empFixture.status,
        personal: empFixture.personal,
        job: empFixture.job,
        createdAt: new Date(empFixture.createdAt),
        updatedAt: new Date(empFixture.updatedAt),
      },
    });

    const empId = empFixture.id;

    // Transition 1: INVITED -> DOCUMENTS_PENDING
    let res = await request(app.getHttpServer())
      .post(`/employees/${empId}/open-preboarding`)
      .set('Authorization', `Bearer ${newHireToken}`)
      .send()
      .expect(201);
    expect(res.body.status).toBe('DOCUMENTS_PENDING');

    // Transition 2: DOCUMENTS_PENDING -> DOCUMENTS_SUBMITTED
    const docsPayload = [
      { type: 'AADHAAR' },
      { type: 'PAN' },
      { type: 'EDUCATION' },
      { type: 'RELIEVING_LETTER' },
      { type: 'BANK_PROOF' },
      { type: 'PHOTO' },
    ];
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/submit-documents`)
      .set('Authorization', `Bearer ${newHireToken}`)
      .send({ docs: docsPayload })
      .expect(201);
    expect(res.body.status).toBe('DOCUMENTS_SUBMITTED');

    // Transition 3: DOCUMENTS_SUBMITTED -> UNDER_REVIEW (runExtraction)
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/run-extraction`)
      .set('Authorization', `Bearer ${newHireToken}`)
      .send()
      .expect(201);
    expect(res.body.status).toBe('UNDER_REVIEW');

    // Verify all docs are EXTRACTED in db
    const docs = await db.document.findMany({ where: { employeeId: empId } });
    expect(docs.length).toBe(6);
    docs.forEach((d) => expect(d.status).toBe('EXTRACTED'));

    // HR verifies all documents individually
    for (const doc of docs) {
      await request(app.getHttpServer())
        .post(`/employees/${empId}/verify-document`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ docId: doc.id })
        .expect(201);
    }

    // Transition 4: UNDER_REVIEW -> MANAGER_REVIEW (approveReview)
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/approve-review`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send()
      .expect(201);
    expect(res.body.status).toBe('MANAGER_REVIEW');

    // Transition 4.5: MANAGER_REVIEW -> COMPLIANCE_PROCESSING (approveHire)
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/approve-hire`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send()
      .expect(201);
    expect(res.body.status).toBe('COMPLIANCE_PROCESSING');

    // Transition 5: COMPLIANCE_PROCESSING -> PENDING_SIGNATURE (computeCompliance)
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/compute-compliance`)
      .set('Authorization', `Bearer ${newHireToken}`)
      .send()
      .expect(201);
    expect(res.body.status).toBe('PENDING_SIGNATURE');

    // Assert ComplianceForm array contains PF_FORM11, PF_FORM2, ESI_FORM1
    const forms = await db.complianceForm.findMany({
      where: { employeeId: empId },
    });
    expect(forms.length).toBe(3);
    const formTypes = forms.map((f) => f.type);
    expect(formTypes).toContain('PF_FORM11');
    expect(formTypes).toContain('PF_FORM2');
    expect(formTypes).toContain('ESI_FORM1');

    // Transition 6: PENDING_SIGNATURE -> DAY1_READY (sign all forms)
    for (const form of forms) {
      res = await request(app.getHttpServer())
        .post(`/employees/${empId}/sign-form/${form.id}`)
        .set('Authorization', `Bearer ${newHireToken}`)
        .send({ signedBy: empId })
        .expect(201);
    }
    expect(res.body.status).toBe('DAY1_READY');

    // Transition 7: DAY1_READY -> ACTIVE
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/complete-milestone`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ type: 'DAY1' })
      .expect(201);
    expect(res.body.status).toBe('ACTIVE');

    // Transition 8: ACTIVE -> MILESTONE_30
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/complete-milestone`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ type: '30' })
      .expect(201);
    expect(res.body.status).toBe('MILESTONE_30');

    // Transition 9: MILESTONE_30 -> MILESTONE_60
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/complete-milestone`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ type: '60' })
      .expect(201);
    expect(res.body.status).toBe('MILESTONE_60');

    // Transition 10: MILESTONE_60 -> ONBOARDING_COMPLETE (via 90)
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/complete-milestone`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ type: '90' })
      .expect(201);
    expect(res.body.status).toBe('ONBOARDING_COMPLETE');

    // Assert final forms status
    const finalForms = await db.complianceForm.findMany({
      where: { employeeId: empId },
    });
    finalForms.forEach((f) => expect(f.status).toBe('SIGNED'));
  });

  it('ESI Exclusion - salary > 21000', async () => {
    // 1. Seed high salary employee
    const empFixture = JSON.parse(
      JSON.stringify(mockEmployees.find((e) => e.id === 'emp_high_salary')),
    );
    await db.employee.create({
      data: {
        id: empFixture.id,
        status: 'COMPLIANCE_PROCESSING',
        personal: empFixture.personal,
        job: empFixture.job,
        createdAt: new Date(empFixture.createdAt),
        updatedAt: new Date(empFixture.updatedAt),
      },
    });
    const empId = empFixture.id;

    // Transition 5: COMPLIANCE_PROCESSING -> PENDING_SIGNATURE
    await request(app.getHttpServer())
      .post(`/employees/${empId}/compute-compliance`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send()
      .expect(201);

    // Assert ComplianceForm array does NOT contain ESI_FORM1
    const forms = await db.complianceForm.findMany({
      where: { employeeId: empId },
    });
    const formTypes = forms.map((f) => f.type);
    expect(formTypes).not.toContain('ESI_FORM1');
    expect(formTypes).toContain('PF_FORM11');
    expect(formTypes).toContain('PF_FORM2');
  });

  it('Negative test: sign wrong employee form', async () => {
    const empFixture = JSON.parse(
      JSON.stringify(mockEmployees.find((e) => e.id === 'emp_low_salary')),
    );
    await db.employee.create({
      data: {
        id: empFixture.id,
        status: 'PENDING_SIGNATURE',
        personal: empFixture.personal,
        job: empFixture.job,
        createdAt: new Date(empFixture.createdAt),
        updatedAt: new Date(empFixture.updatedAt),
      },
    });
    const empId = empFixture.id;

    // Create PF Form
    const testForm = {
      id: 'form123',
      employeeId: empId,
      type: 'PF_FORM11',
      status: 'PENDING_SIGNATURE',
      deadline: new Date().toISOString(),
      data: {},
    };

    await db.complianceForm.create({
      data: {
        id: testForm.id,
        employeeId: testForm.employeeId,
        type: testForm.type as any,
        status: testForm.status as any,
        deadline: new Date(testForm.deadline),
        data: testForm.data,
      },
    });

    // Call signForm with wrong employee signedBy token (bob instead of alice)
    await request(app.getHttpServer())
      .post(`/employees/${empId}/sign-form/${testForm.id}`)
      .set('Authorization', `Bearer ${otherNewHireToken}`)
      .send({ signedBy: 'some_other_id' })
      .expect(403);
  });

  it('Negative test: approveReview when a doc is still REJECTED', async () => {
    const empFixture = JSON.parse(
      JSON.stringify(mockEmployees.find((e) => e.id === 'emp_low_salary')),
    );
    await db.employee.create({
      data: {
        id: empFixture.id,
        status: 'UNDER_REVIEW',
        personal: empFixture.personal,
        job: empFixture.job,
        createdAt: new Date(empFixture.createdAt),
        updatedAt: new Date(empFixture.updatedAt),
      },
    });
    const empId = empFixture.id;

    // Seed mock docs with one rejected
    const docs = [
      'AADHAAR',
      'PAN',
      'EDUCATION',
      'RELIEVING_LETTER',
      'BANK_PROOF',
      'PHOTO',
    ].map((type, idx) => ({
      id: `doc_${idx}`,
      employeeId: empId,
      type,
      status: type === 'PAN' ? 'REJECTED' : 'VERIFIED',
      extracted: null,
      reviewedBy: 'HR',
      rejectionReason: type === 'PAN' ? 'Blurry photo' : null,
    }));

    for (const doc of docs) {
      await db.document.create({
        data: {
          id: doc.id,
          employeeId: doc.employeeId,
          type: doc.type as any,
          status: doc.status as any,
          extracted: doc.extracted,
          reviewedBy: doc.reviewedBy,
          rejectionReason: doc.rejectionReason,
          storagePath: `mock-path/${doc.type}`,
        },
      });
    }

    await request(app.getHttpServer())
      .post(`/employees/${empId}/approve-review`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send()
      .expect(409);
  });

  it('Negative test: call any protected route with no Authorization header -> expect 401', async () => {
    const empFixture = JSON.parse(
      JSON.stringify(mockEmployees.find((e) => e.id === 'emp_low_salary')),
    );
    await request(app.getHttpServer())
      .post(`/employees/${empFixture.id}/open-preboarding`)
      .send()
      .expect(401);
  });

  it('Negative test: call an HR-only route with a valid NEW_HIRE token -> expect 403', async () => {
    const empFixture = JSON.parse(
      JSON.stringify(mockEmployees.find((e) => e.id === 'emp_low_salary')),
    );
    await request(app.getHttpServer())
      .post(`/employees/${empFixture.id}/approve-review`)
      .set('Authorization', `Bearer ${newHireToken}`)
      .send()
      .expect(403);
  });

  describe('Auth Registration & OTP flow', () => {
    it('Success case: Register and verify OTP via invitation code', async () => {
      // 1. Generate invitation code
      const inviteCode = 'INV_' + Math.random().toString(36).substring(7);
      await db.invitationCode.create({
        data: {
          code: inviteCode,
          jobTitle: 'Developer',
          department: 'Engineering',
          managerId: 'mgr_123',
          salary: 15000,
          joiningDate: new Date(),
        },
      });

      // 2. Register
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          invitationCode: inviteCode,
          email: 'newcandidate@example.com',
          pass: 'validPass123',
          name: 'New Candidate',
          dob: '1998-01-01',
          phone: '+1234567890',
        })
        .expect(201);

      expect(regRes.body.message).toContain('OTP sent');

      // Invitation code should be marked used
      const codeRecord = await db.invitationCode.findUnique({
        where: { code: inviteCode },
      });
      expect(codeRecord?.used).toBe(true);

      // 3. Retrieve generated OTP
      const user = await db.user.findUnique({
        where: { email: 'newcandidate@example.com' },
      });
      const latestOtp = await db.otpCode.findFirst({
        where: { userId: user?.id },
        orderBy: { expiresAt: 'desc' },
      });
      expect(latestOtp).toBeDefined();

      // 4. Verify OTP
      const verifyRes = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'newcandidate@example.com',
          otp: latestOtp?.code,
        })
        .expect(201);

      expect(verifyRes.body.access_token).toBeDefined();

      // Employee status should transition to DOCUMENTS_PENDING
      const employee = await db.employee.findUnique({
        where: { id: user?.employeeId || '' },
      });
      expect(employee?.status).toBe('DOCUMENTS_PENDING');
    });

    it('Failure case: register with already used invitation code', async () => {
      const inviteCode = 'USED_' + Math.random().toString(36).substring(7);
      await db.invitationCode.create({
        data: {
          code: inviteCode,
          jobTitle: 'Developer',
          department: 'Engineering',
          managerId: 'mgr_123',
          salary: 15000,
          joiningDate: new Date(),
          used: true,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          invitationCode: inviteCode,
          email: 'failcandidate@example.com',
          pass: 'validPass123',
          name: 'Fail Candidate',
          dob: '1998-01-01',
          phone: '+1234567890',
        })
        .expect(409);
    });

    it('Failure case: verify with expired/invalid OTP', async () => {
      // Create user
      const user = await db.user.create({
        data: {
          email: 'wrongotp@example.com',
          passwordHash: 'dummyhash',
          role: 'NEW_HIRE',
        },
      });

      // Create expired OTP
      await db.otpCode.create({
        data: {
          userId: user.id,
          code: '111111',
          expiresAt: new Date(Date.now() - 1000), // expired 1s ago
        },
      });

      await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'wrongotp@example.com',
          otp: '111111',
        })
        .expect(409);
    });
  });
});
