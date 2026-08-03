import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DbService } from '../src/db/db.service';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Employee Onboarding Workflow (e2e)', () => {
  let app: INestApplication<App>;
  let db: DbService;
  let mockEmployees: any[];

  beforeAll(async () => {
    const employeesPath = path.join(process.cwd(), 'fixtures', 'employees.json');
    const content = await fs.readFile(employeesPath, 'utf-8');
    mockEmployees = JSON.parse(content);
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = moduleFixture.get<DbService>(DbService);
    db.clear();
  });

  afterEach(async () => {
    await app.close();
  });

  it('Happy Path - salary < 21000 (ESI and PF applicable)', async () => {
    // 1. Seed employee from fixture
    const empFixture = JSON.parse(JSON.stringify(mockEmployees.find((e) => e.id === 'emp_low_salary')));
    db.employees.push(empFixture);

    const empId = empFixture.id;

    // Transition 1: INVITED -> DOCUMENTS_PENDING
    let res = await request(app.getHttpServer())
      .post(`/employees/${empId}/open-preboarding`)
      .send({ role: 'NEW_HIRE' })
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
      .send({ docs: docsPayload, role: 'NEW_HIRE' })
      .expect(201);
    expect(res.body.status).toBe('DOCUMENTS_SUBMITTED');

    // Transition 3: DOCUMENTS_SUBMITTED -> UNDER_REVIEW (runExtraction)
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/run-extraction`)
      .send()
      .expect(201);
    expect(res.body.status).toBe('UNDER_REVIEW');

    // Verify all docs are EXTRACTED in db
    const docs = db.documents.filter((d) => d.employeeId === empId);
    expect(docs.length).toBe(6);
    docs.forEach((d) => expect(d.status).toBe('EXTRACTED'));

    // HR verifies all documents individually
    for (const doc of docs) {
      await request(app.getHttpServer())
        .post(`/employees/${empId}/verify-document`)
        .send({ docId: doc.id, role: 'HR' })
        .expect(201);
    }

    // Transition 4: UNDER_REVIEW -> COMPLIANCE_PROCESSING (approveReview)
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/approve-review`)
      .send({ role: 'HR' })
      .expect(201);
    expect(res.body.status).toBe('COMPLIANCE_PROCESSING');

    // Transition 5: COMPLIANCE_PROCESSING -> PENDING_SIGNATURE (computeCompliance)
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/compute-compliance`)
      .send()
      .expect(201);
    expect(res.body.status).toBe('PENDING_SIGNATURE');

    // Assert ComplianceForm array contains PF_FORM11, PF_FORM2, ESI_FORM1
    const forms = db.complianceForms.filter((f) => f.employeeId === empId);
    expect(forms.length).toBe(3);
    const formTypes = forms.map((f) => f.type);
    expect(formTypes).toContain('PF_FORM11');
    expect(formTypes).toContain('PF_FORM2');
    expect(formTypes).toContain('ESI_FORM1');

    // Transition 6: PENDING_SIGNATURE -> DAY1_READY (sign all forms)
    for (const form of forms) {
      res = await request(app.getHttpServer())
        .post(`/employees/${empId}/sign-form/${form.id}`)
        .send({ role: 'NEW_HIRE', signedBy: empId })
        .expect(201);
    }
    expect(res.body.status).toBe('DAY1_READY');

    // Transition 7: DAY1_READY -> ACTIVE
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/complete-milestone`)
      .send({ type: 'DAY1', role: 'HR' })
      .expect(201);
    expect(res.body.status).toBe('ACTIVE');

    // Transition 8: ACTIVE -> MILESTONE_30
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/complete-milestone`)
      .send({ type: '30', role: 'HR' })
      .expect(201);
    expect(res.body.status).toBe('MILESTONE_30');

    // Transition 9: MILESTONE_30 -> MILESTONE_60
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/complete-milestone`)
      .send({ type: '60', role: 'HR' })
      .expect(201);
    expect(res.body.status).toBe('MILESTONE_60');

    // Transition 10: MILESTONE_60 -> ONBOARDING_COMPLETE (via 90)
    res = await request(app.getHttpServer())
      .post(`/employees/${empId}/complete-milestone`)
      .send({ type: '90', role: 'HR' })
      .expect(201);
    expect(res.body.status).toBe('ONBOARDING_COMPLETE');

    // Assert final forms status
    forms.forEach((f) => expect(f.status).toBe('SIGNED'));
  });

  it('ESI Exclusion - salary > 21000', async () => {
    // 1. Seed high salary employee
    const empFixture = JSON.parse(JSON.stringify(mockEmployees.find((e) => e.id === 'emp_high_salary')));
    db.employees.push(empFixture);
    const empId = empFixture.id;

    // Transition to COMPLIANCE_PROCESSING
    db.employees[0].status = 'COMPLIANCE_PROCESSING';

    // Transition 5: COMPLIANCE_PROCESSING -> PENDING_SIGNATURE
    await request(app.getHttpServer())
      .post(`/employees/${empId}/compute-compliance`)
      .send()
      .expect(201);

    // Assert ComplianceForm array does NOT contain ESI_FORM1
    const forms = db.complianceForms.filter((f) => f.employeeId === empId);
    const formTypes = forms.map((f) => f.type);
    expect(formTypes).not.toContain('ESI_FORM1');
    expect(formTypes).toContain('PF_FORM11');
    expect(formTypes).toContain('PF_FORM2');
  });

  it('Negative test: sign wrong employee form', async () => {
    const empFixture = JSON.parse(JSON.stringify(mockEmployees.find((e) => e.id === 'emp_low_salary')));
    db.employees.push(empFixture);
    const empId = empFixture.id;

    db.employees[0].status = 'PENDING_SIGNATURE';
    
    // Create PF Form
    const testForm = {
      id: 'form123',
      employeeId: empId,
      type: 'PF_FORM11',
      status: 'PENDING_SIGNATURE',
      deadline: new Date().toISOString(),
      data: {},
    };
    db.complianceForms.push(testForm as any);

    // Call signForm with wrong employee signedBy
    await request(app.getHttpServer())
      .post(`/employees/${empId}/sign-form/${testForm.id}`)
      .send({ role: 'NEW_HIRE', signedBy: 'some_other_id' })
      .expect(403);
  });

  it('Negative test: approveReview when a doc is still REJECTED', async () => {
    const empFixture = JSON.parse(JSON.stringify(mockEmployees.find((e) => e.id === 'emp_low_salary')));
    db.employees.push(empFixture);
    const empId = empFixture.id;

    db.employees[0].status = 'UNDER_REVIEW';

    // Seed mock docs with one rejected
    const docs = ['AADHAAR', 'PAN', 'EDUCATION', 'RELIEVING_LETTER', 'BANK_PROOF', 'PHOTO'].map((type, idx) => ({
      id: `doc_${idx}`,
      employeeId: empId,
      type,
      status: type === 'PAN' ? 'REJECTED' : 'VERIFIED',
      extracted: null,
      reviewedBy: 'HR',
      rejectionReason: type === 'PAN' ? 'Blurry photo' : null,
    }));
    db.documents.push(...(docs as any[]));

    await request(app.getHttpServer())
      .post(`/employees/${empId}/approve-review`)
      .send({ role: 'HR' })
      .expect(409);
  });
});
