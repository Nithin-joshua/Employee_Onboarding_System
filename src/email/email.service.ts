import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.BREVO_API_KEY;

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
    await this.sendMail(email, 'Hiring Confirmed - Welcome to the Team!', htmlContent);
  }

  private async sendMail(to: string, subject: string, htmlContent: string) {
    if (!this.apiKey || this.apiKey === 'mock_brevo_api_key_for_testing') {
      this.logger.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
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
          sender: { name: 'Onboarding System', email: 'no-reply@onboarding.com' },
          to: [{ email: to }],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo API Error: ${response.status} - ${errorText}`);
      } else {
        this.logger.log(`Email successfully sent to ${to} via Brevo`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }
}
