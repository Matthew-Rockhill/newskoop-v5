import { describe, it, expect, afterEach } from 'vitest';
import { isEmailAllowed, EMAIL_CONFIGS, getEmailConfig } from '../email-config';
import type { EmailConfig } from '../email-config';

describe('Email System Configuration', () => {
  describe('Environment Configurations', () => {
    it('Development mode logs to console only', () => {
      expect(EMAIL_CONFIGS.development.mode).toBe('console');
      expect(EMAIL_CONFIGS.development.allowedDomains).toContain('*');
    });

    it('Staging restricts to newskoop domains', () => {
      expect(EMAIL_CONFIGS.staging.mode).toBe('resend-restricted');
      expect(EMAIL_CONFIGS.staging.allowedDomains).toContain('newskoop.com');
      expect(EMAIL_CONFIGS.staging.allowedDomains).toContain('newskoop.co.za');
    });

    it('Production allows all emails', () => {
      expect(EMAIL_CONFIGS.production.mode).toBe('resend');
      expect(EMAIL_CONFIGS.production.allowedDomains).toContain('*');
    });

    it('Staging has catch-all email for debugging', () => {
      expect(EMAIL_CONFIGS.staging.catchAllEmail).toBeDefined();
      expect(EMAIL_CONFIGS.staging.catchAllEmail).toContain('newskoop.com');
    });
  });

  describe('Email Domain Filtering', () => {
    describe('Wildcard Mode (Development/Production)', () => {
      const wildcardConfig: EmailConfig = {
        mode: 'console',
        allowedDomains: ['*'],
      };

      it('Any email allowed with wildcard', () => {
        expect(isEmailAllowed('user@gmail.com', wildcardConfig)).toBe(true);
        expect(isEmailAllowed('test@company.co.za', wildcardConfig)).toBe(true);
        expect(isEmailAllowed('random@anything.org', wildcardConfig)).toBe(true);
      });
    });

    describe('Restricted Mode (Staging)', () => {
      const stagingConfig: EmailConfig = {
        mode: 'resend-restricted',
        allowedDomains: ['newskoop.com', 'newskoop.co.za'],
      };

      it('Newskoop emails allowed', () => {
        expect(isEmailAllowed('editor@newskoop.com', stagingConfig)).toBe(true);
        expect(isEmailAllowed('admin@newskoop.co.za', stagingConfig)).toBe(true);
      });

      it('External emails blocked', () => {
        expect(isEmailAllowed('user@gmail.com', stagingConfig)).toBe(false);
        expect(isEmailAllowed('test@competitor.com', stagingConfig)).toBe(false);
      });

      it('Subdomains allowed', () => {
        expect(isEmailAllowed('user@mail.newskoop.com', stagingConfig)).toBe(true);
        expect(isEmailAllowed('test@staging.newskoop.co.za', stagingConfig)).toBe(true);
      });

      it('Case insensitive matching', () => {
        expect(isEmailAllowed('USER@NEWSKOOP.COM', stagingConfig)).toBe(true);
        expect(isEmailAllowed('Test@NewSkoop.Co.Za', stagingConfig)).toBe(true);
      });
    });

    describe('Empty Domains List', () => {
      const emptyConfig: EmailConfig = {
        mode: 'resend-restricted',
        allowedDomains: [],
      };

      it('All emails blocked with empty list', () => {
        expect(isEmailAllowed('anyone@anywhere.com', emptyConfig)).toBe(false);
      });
    });
  });

  describe('Runtime Configuration', () => {
    const originalEmailMode = process.env.EMAIL_MODE;

    afterEach(() => {
      if (originalEmailMode !== undefined) {
        process.env.EMAIL_MODE = originalEmailMode;
      } else {
        process.env.EMAIL_MODE = undefined;
      }
    });

    it('EMAIL_MODE=console returns console config', () => {
      process.env.EMAIL_MODE = 'console';
      const config = getEmailConfig();
      expect(config.mode).toBe('console');
    });

    it('EMAIL_MODE=resend-restricted returns restricted config', () => {
      process.env.EMAIL_MODE = 'resend-restricted';
      const config = getEmailConfig();
      expect(config.mode).toBe('resend-restricted');
    });

    it('EMAIL_MODE=resend returns full email config', () => {
      process.env.EMAIL_MODE = 'resend';
      const config = getEmailConfig();
      expect(config.mode).toBe('resend');
    });

    it('Config always has required properties', () => {
      process.env.EMAIL_MODE = 'console';
      const config = getEmailConfig();
      expect(config).toHaveProperty('mode');
      expect(config).toHaveProperty('allowedDomains');
      expect(Array.isArray(config.allowedDomains)).toBe(true);
    });
  });
});
