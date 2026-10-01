import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import assert from 'assert';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting Phase 1 Test...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    
    // Debugging hooks
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('requestfailed', request => {
      console.log('BROWSER REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });
    page.on('response', response => {
      if (!response.ok()) {
        console.log('BROWSER RESPONSE ERROR:', response.url(), response.status());
      }
    });

    const code = await prisma.invitationCode.findFirst({ where: { used: false } });
    assert(code, 'No unused invitation code found');
    const invitationCode = code!.code;

    console.log('Navigating to register page...');
    await page.goto('http://onboarding_frontend:3002/register');
    
    // Step A
    await page.type('input[name="name"]', 'Test Candidate');
    await page.type('input[name="email"]', 'test_e2e_candidate@example.com');
    await page.type('input[name="dob"]', '1990-01-01');
    await page.type('input[name="phone"]', '+15550000000');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('input[name="invitationCode"]');
    
    // Step B
    await page.type('input[name="invitationCode"]', invitationCode);
    await page.type('input[name="pass"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for OTP...');
    await page.waitForSelector('#otp-0', { timeout: 10000 });
    
    // Validate DB State
    const updatedCode = await prisma.invitationCode.findUnique({ where: { id: code!.id }});
    assert(updatedCode!.used === true, 'Code was not marked as used');
    
    const user = await prisma.user.findUnique({ where: { email: 'test_e2e_candidate@example.com' } });
    assert(user, 'User was not created in DB');
    
    const otpRec = await prisma.otpCode.findFirst({ where: { userId: user!.id }, orderBy: { expiresAt: 'desc' } });
    assert(otpRec, 'OTP record was not created');
    
    console.log('Entering OTP...');
    const otpString = otpRec!.code;
    for(let i=0; i<6; i++) {
      await page.type('#otp-' + i, otpString[i]);
    }
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    assert(page.url().includes('/signin'), 'Did not redirect to signin');
    
    console.log('Validating duplicate code rejection...');
    const dupRes = await fetch('http://127.0.0.1:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dup', email: 'dup@example.com', pass: 'TestPass123!', invitationCode, dob: '1990-01-01', phone: '+15551112222' })
    });
    assert(dupRes.status === 409, 'Duplicate code should return 409');
    
    console.log('Phase 1 tests passed successfully! ✅');
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

run().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
