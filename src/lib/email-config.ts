// Email configuration for different environments
export type EmailMode = 'console' | 'resend-restricted' | 'resend';

export interface EmailConfig {
  mode: EmailMode;
  allowedDomains: string[];
  catchAllEmail?: string;
}

export const EMAIL_CONFIGS: Record<string, EmailConfig> = {
  development: {
    mode: 'console',
    allowedDomains: ['*'], // Any email works in development
  },
  staging: {
    mode: 'resend-restricted',
    allowedDomains: ['newskoop.com', 'newskoop.co.za', 'test.newskoop.com'],
    catchAllEmail: 'staging-emails@newskoop.com',
  },
  production: {
    mode: 'resend',
    allowedDomains: ['*'], // All emails allowed in production
  },
};

export function getEmailConfig(): EmailConfig {
  // Allow EMAIL_MODE env var to override default behavior
  const emailMode = process.env.EMAIL_MODE as EmailMode;
  if (emailMode) {
    return {
      mode: emailMode,
      allowedDomains: emailMode === 'console' ? ['*'] : EMAIL_CONFIGS.staging.allowedDomains,
      catchAllEmail: emailMode === 'resend-restricted' ? EMAIL_CONFIGS.staging.catchAllEmail : undefined,
    };
  }

  // Default to environment-based config
  const env = process.env.NODE_ENV || 'development';
  return EMAIL_CONFIGS[env] || EMAIL_CONFIGS.development;
}

export function isEmailAllowed(email: string, config: EmailConfig): boolean {
  if (config.allowedDomains.includes('*')) {
    return true;
  }
  
  const emailDomain = email.split('@')[1];
  return config.allowedDomains.some(domain => 
    emailDomain.toLowerCase().endsWith(domain.toLowerCase())
  );
}