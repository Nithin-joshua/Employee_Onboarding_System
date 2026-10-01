import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('OnboardPro Full Backend Workflow (Puppeteer E2E)', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
    await prisma.$disconnect();
  });

  it('Phase 1 - Auth & Identity: Register a new candidate', async () => {
    const code = await prisma.invitationCode.findFirst({ where: { used: false } });
    expect(code).toBeDefined();

    // The frontend is mapped to onboarding_frontend:3002 within Docker network
    await page.goto('http://onboarding_frontend:3002/register');
    
    // Step A
    await page.type('input[name="name"]', 'Test Candidate');
    await page.type('input[name="email"]', 'test_e2e_candidate@example.com');
    await page.type('input[name="dob"]', '1990-01-01');
    await page.type('input[name="phone"]', '+15550000000');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('input[name="invitationCode"]');
    
    // Step B
    await page.type('input[name="invitationCode"]', code.code);
    await page.type('input[name="pass"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('#otp-0', { timeout: 10000 });
    
    // Validate DB State
    const updatedCode = await prisma.invitationCode.findUnique({ where: { id: code.id }});
    expect(updatedCode.used).toBe(true);
    
    const user = await prisma.user.findUnique({ where: { email: 'test_e2e_candidate@example.com' } });
    expect(user).toBeDefined();
    
    const otpRec = await prisma.otpCode.findFirst({ where: { userId: user.id }, orderBy: { expiresAt: 'desc' } });
    expect(otpRec).toBeDefined();
    
    const otpString = otpRec.code;
    for(let i=0; i<6; i++) {
      await page.type('#otp-' + i, otpString[i]);
    }
    await page.click('button[type="submit"]');
    
    // Check successful redirect to signin
    await page.waitForNavigation();
    expect(page.url()).toContain('/signin');
    
    // Check conflict for duplicate code
    const dupRes = await fetch('http://127.0.0.1:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dup', email: 'dup@example.com', pass: 'TestPass123!', invitationCode: code.code, dob: '1990-01-01', phone: '+15551112222' })
    });
    expect(dupRes.status).toBe(409);
  }, 30000);
});
