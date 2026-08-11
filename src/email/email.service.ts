import { Injectable } from '@nestjs/common';

/**
 * EmailService sends transactional emails via the Brevo API.
 *
 * Email sending mode is controlled by:
 *   - If BREVO_API_KEY is not set: logs emails to console (dev/test convenience).
 *   - If BREVO_API_KEY is set: sends real emails via Brevo SMTP API.
 *
 * To suppress real email sending in development, simply omit BREVO_API_KEY
 * from your .env file. Do NOT use placeholder key values.
 */
@Injectable()
export class EmailService {
  private readonly logger = {
    log: (msg: string) => console.log(`[EmailService] ${msg}`),
    error: (msg: string) => console.error(`[EmailService] ${msg}`),
  };
  private readonly apiKey = process.env.BREVO_API_KEY || '';

  async sendOtp(email: string, otp: string): Promise<void> {
    const htmlContent = `
      <html>
        <body>
          <h2>Your OTP Verification Code</h2>
          <p>Please use the following 6-digit One-Time Password to complete your registration:</p>
          <h3 style="font-size: 24px; letter-spacing: 4px; color: #1a73e8;">${otp}</h3>
          <p>This code is valid for 10 minutes.</p>
        </body>
      </html>
    `;
    await this.sendMail(email, 'Verify your Email - OTP', htmlContent);
  }

  async sendHireConfirmation(email: string, name: string): Promise<void> {
    const htmlContent = `
      <html>
        <body>
          <h2>Congratulations, ${name}! 🎉</h2>
          <p>We are thrilled to inform you that your hiring process is finalized and has been approved by your Manager.</p>
          <p>Your compliance documentation generation has begun. Welcome to the team!</p>
        </body>
      </html>
    `;
    await this.sendMail(
      email,
      'Hiring Confirmed - Welcome to the Team!',
      htmlContent,
    );
  }

  async sendOnboardingInvite(
    email: string,
    name: string,
    tempPassword: string,
  ): Promise<void> {
    const htmlContent = `
      <html>
        <body>
          <h2>Welcome aboard, ${name}! 🎉</h2>
          <p>You have been added to the Employee Onboarding System.</p>
          <p>Please log in using your email and the following temporary password:</p>
          <h3 style="font-size: 20px; color: #1a73e8;">${tempPassword}</h3>
          <p>We recommend updating your password after logging in.</p>
        </body>
      </html>
    `;
    await this.sendMail(
      email,
      'Your Onboarding Account Credentials',
      htmlContent,
    );
  }

  private async sendMail(to: string, subject: string, htmlContent: string) {
    if (!this.apiKey) {
      // No API key configured — log to console. Set BREVO_API_KEY in .env to send real emails.
      console.log(
        `[EmailService] [LOG MODE] To: ${to} | Subject: ${subject} | (Set BREVO_API_KEY in .env to enable real email delivery)`,
      );
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Onboarding System',
            email: process.env.BREVO_SENDER_EMAIL || 'suprithchethu@gmail.com',
          },
          to: [{ email: to }],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[EmailService] Brevo API Error: ${response.status} - ${errorText}`,
        );
      } else {
        console.log(`[EmailService] Email sent to ${to} via Brevo`);
      }
    } catch (error) {
      console.error(
        `[EmailService] Failed to send email to ${to}: ${(error as Error).message}`,
      );
    }
  }
}
