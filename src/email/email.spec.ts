import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('Log Mode', () => {
    beforeEach(async () => {
      process.env.BREVO_API_KEY = '';
      const module: TestingModule = await Test.createTestingModule({
        providers: [EmailService],
      }).compile();
      service = module.get<EmailService>(EmailService);
    });

    it('should log to console and not call fetch when BREVO_API_KEY is not set', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      global.fetch = jest.fn();

      await service.sendOtp('test@example.com', '123456');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[EmailService] [LOG MODE] To: test@example.com',
        ),
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('API Mode', () => {
    beforeEach(async () => {
      process.env.BREVO_API_KEY = 'test-api-key';
      const module: TestingModule = await Test.createTestingModule({
        providers: [EmailService],
      }).compile();
      service = module.get<EmailService>(EmailService);
    });

    it('should send email successfully via Brevo API', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      } as Response);

      await service.sendOtp('test@example.com', '123456');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'api-key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('123456'),
        }),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[EmailService] Email sent to test@example.com via Brevo',
        ),
      );
    });

    it('should handle Brevo API error response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid payload'),
      } as Response);

      await service.sendHireConfirmation('test@example.com', 'John Doe');

      expect(global.fetch).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[EmailService] Brevo API Error: 400 - Invalid payload',
        ),
      );
    });

    it('should handle network/fetch failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest
        .spyOn(global, 'fetch')
        .mockRejectedValue(new Error('Connection timeout'));

      await service.sendOnboardingInvite(
        'test@example.com',
        'Jane Doe',
        'tempPass123',
      );

      expect(global.fetch).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[EmailService] Failed to send email to test@example.com: Connection timeout',
        ),
      );
    });

    it('should cover the logger helper methods', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const serviceWithLogger = service as unknown as {
        logger: { log: (msg: string) => void; error: (msg: string) => void };
      };
      serviceWithLogger.logger.log('test log');
      serviceWithLogger.logger.error('test error');

      expect(consoleLogSpy).toHaveBeenCalledWith('[EmailService] test log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[EmailService] test error');
    });
  });
});
