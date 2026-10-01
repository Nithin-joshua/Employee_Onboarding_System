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

  async sendInvitationEmail(
    email: string,
    jobTitle: string,
    department: string,
    code: string,
    joiningDate?: string,
  ): Promise<void> {
    const formattedDate = joiningDate
      ? new Date(joiningDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
            .card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 580px; margin: 0 auto; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .badge { display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
            h1 { font-size: 22px; color: #0f172a; margin-top: 16px; margin-bottom: 8px; }
            p { font-size: 14px; line-height: 1.6; color: #475569; margin: 8px 0; }
            .code-box { background: #f8fafc; border: 2px dashed #059669; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0; }
            .code-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 700; margin-bottom: 6px; }
            .code-value { font-family: monospace; font-size: 30px; font-weight: 800; color: #059669; letter-spacing: 6px; }
            .steps { background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
            .steps ol { margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6; }
            .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Official Selection Offer</span>
            <h1>Congratulations! You've Been Selected! 🎉</h1>
            <p>We are delighted to offer you the position of <strong>${jobTitle}</strong> in the <strong>${department}</strong> department.</p>
            ${formattedDate ? `<p><strong>Expected Joining Date:</strong> ${formattedDate}</p>` : ''}
            
            <p>To begin your onboarding journey and upload your verification documents, please use your unique invitation code below:</p>
            
            <div class="code-box">
              <div class="code-label">Your Unique Invitation Code</div>
              <div class="code-value">${code}</div>
            </div>

            <div class="steps">
              <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 13px; color: #0f172a;">Next Steps:</p>
              <ol>
                <li>Open the Employee Onboarding registration page.</li>
                <li>Enter your personal details along with your unique invitation code (<strong>${code}</strong>).</li>
                <li>Set up your secure password and verify your email via the 6-digit OTP.</li>
                <li>Upload your mandatory documents (Aadhaar, PAN, Educational Marks Cards, Bank Proof, Photo).</li>
              </ol>
            </div>

            <div class="footer">
              <p>This is an automated notification from the Employee Onboarding System. If you did not expect this invitation, please contact your HR coordinator.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendMail(
      email,
      `Congratulations! You've been selected for ${jobTitle} - Complete Your Onboarding`,
      htmlContent,
    );
  }

  async sendDocumentRejectedEmail(
    email: string,
    name: string,
    documentType: string,
    reason: string,
  ): Promise<void> {
    const formattedDoc = documentType.replace(/_/g, ' ');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
            .card { background-color: #ffffff; border: 1px solid #fee2e2; border-radius: 12px; max-width: 580px; margin: 0 auto; padding: 32px; box-shadow: 0 4px 12px rgba(239,68,68,0.06); }
            .badge { display: inline-block; background-color: #fef2f2; color: #dc2626; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
            h1 { font-size: 20px; color: #991b1b; margin-top: 16px; margin-bottom: 8px; }
            p { font-size: 14px; line-height: 1.6; color: #475569; margin: 8px 0; }
            .reason-box { background: #fff1f2; border: 1px solid #fecdd3; border-left: 4px solid #e11d48; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
            .reason-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #9f1239; font-weight: 700; margin-bottom: 4px; }
            .reason-text { font-size: 14px; font-weight: 600; color: #881337; }
            .action-box { background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Action Required</span>
            <h1>Document Verification Update</h1>
            <p>Dear <strong>${name}</strong>,</p>
            <p>Your uploaded document (<strong>${formattedDoc}</strong>) was reviewed by our HR team and could not be verified.</p>
            
            <div class="reason-box">
              <div class="reason-label">Reason for Rejection</div>
              <div class="reason-text">${reason}</div>
            </div>

            <div class="action-box">
              <p style="margin: 0 0 6px 0; font-weight: 700; font-size: 13px; color: #0f172a;">What you need to do:</p>
              <p style="margin: 0; font-size: 13px; color: #334155;">Please log into your onboarding portal, navigate to the Document Submission page, and re-upload a clear and valid copy of your ${formattedDoc}.</p>
            </div>

            <div class="footer">
              <p>This is an automated notification from the Employee Onboarding System. If you have questions, please reach out to your HR coordinator.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendMail(
      email,
      `Action Required: ${formattedDoc} Verification Update`,
      htmlContent,
    );
  }

  async sendCustomCandidateEmail(
    email: string,
    name: string,
    subject: string,
    message: string,
  ): Promise<void> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
            .card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 580px; margin: 0 auto; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .badge { display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
            h1 { font-size: 20px; color: #0f172a; margin-top: 16px; margin-bottom: 8px; }
            p { font-size: 14px; line-height: 1.6; color: #475569; margin: 8px 0; }
            .message-box { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #10b981; border-radius: 8px; padding: 18px 20px; margin: 20px 0; white-space: pre-wrap; font-size: 14px; color: #1e293b; line-height: 1.6; }
            .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">HR Notification</span>
            <h1>Message from Human Resources</h1>
            <p>Dear <strong>${name}</strong>,</p>
            <p>Our HR department has sent you the following message regarding your onboarding:</p>
            
            <div class="message-box">${message}</div>

            <div class="footer">
              <p>This is an official communication regarding your onboarding process. For questions, reply to your HR coordinator.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendMail(email, subject, htmlContent);
  }

  async sendManagerReviewNotification(
    managerEmail: string,
    managerName: string,
    candidateName: string,
    jobTitle: string,
    candidateId: string,
  ): Promise<void> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
            .card { background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 12px; max-width: 580px; margin: 0 auto; padding: 32px; box-shadow: 0 4px 12px rgba(99,102,241,0.06); }
            .badge { display: inline-block; background-color: #eef2ff; color: #4f46e5; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
            h1 { font-size: 20px; color: #312e81; margin-top: 16px; margin-bottom: 8px; }
            p { font-size: 14px; line-height: 1.6; color: #475569; margin: 8px 0; }
            .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
            .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Action Required: Manager Review</span>
            <h1>Candidate Ready for Final Approval</h1>
            <p>Dear <strong>${managerName}</strong>,</p>
            <p>HR has verified all mandatory documents for candidate <strong>${candidateName}</strong>.</p>
            
            <div class="details-box">
              <p style="margin: 0 0 6px 0;"><strong>Candidate Name:</strong> ${candidateName}</p>
              <p style="margin: 0 0 6px 0;"><strong>Position:</strong> ${jobTitle}</p>
              <p style="margin: 0;"><strong>Employee ID:</strong> ${candidateId}</p>
            </div>

            <p>Please log in to your Manager Dashboard to review the profile and grant final hiring sign-off.</p>

            <div class="footer">
              <p>Employee Onboarding System — Automated Notification</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendMail(
      managerEmail,
      `Action Required: Manager Review for ${candidateName} (${candidateId})`,
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

    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    if (!senderEmail) {
      console.error(
        '[EmailService] BREVO_SENDER_EMAIL is not set in .env. Brevo requires a verified sender email.',
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
            name: 'Employee Onboarding System',
            email: senderEmail,
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
