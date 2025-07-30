import sgMail from '@sendgrid/mail';
import { generateMagicLink, generateToken } from './auth';
import { getEmailConfig, isEmailAllowed } from './email-config';
import { logEmail } from './email-logger';
import { EmailType } from '@prisma/client';

// Initialize SendGrid only if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  type?: EmailType;
  userId?: string;
}

export async function sendEmail({ to, subject, html, type = 'SYSTEM', userId }: SendEmailOptions) {
  const config = getEmailConfig();
  
  // Check if email is allowed based on environment
  const isAllowed = isEmailAllowed(to, config);
  let actualRecipient = to;
  let actualSubject = subject;
  
  if (!isAllowed && config.catchAllEmail) {
    // Redirect to catch-all with original recipient in subject
    actualSubject = `[Originally to: ${to}] ${subject}`;
    actualRecipient = config.catchAllEmail;
  }
  
  // Handle based on email mode
  switch (config.mode) {
    case 'console':
      console.log('\n📧 Email (Console Mode)');
      console.log('To:', actualRecipient);
      console.log('Subject:', actualSubject);
      console.log('---');
      // Extract and log any links
      const linkMatch = html.match(/href="([^"]+)"/);
      if (linkMatch) {
        const link = linkMatch[1];
        // Check if this is a magic link or password reset link (both use set-password)
        if (link.includes('set-password')) {
          if (link.includes('auth/set-password')) {
            console.log('🔑 PASSWORD RESET LINK:', link);
          } else {
            console.log('✨ MAGIC LINK:', link);
          }
        } else {
          console.log('🔗 Link:', link);
        }
      }
      console.log('---\n');
      
      // Log email even in console mode
      await logEmail({
        to: actualRecipient,
        subject: actualSubject,
        type,
        userId,
        status: 'SENT',
        metadata: { mode: 'console', originalRecipient: to !== actualRecipient ? to : undefined },
      });
      
      return; // Success in console mode
      
    case 'sendgrid-restricted':
    case 'sendgrid':
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY not configured, falling back to console mode');
        console.log('\n📧 Email (Fallback Console Mode)');
        console.log('To:', actualRecipient);
        console.log('Subject:', actualSubject);
        return;
      }
      
      try {
        // Log email attempt
        const emailLog = await logEmail({
          to: actualRecipient,
          from: process.env.SENDGRID_FROM_EMAIL || 'Newskoop <no-reply@newskoop.co.za>',
          subject: actualSubject,
          type,
          userId,
          status: 'PENDING',
          metadata: { originalRecipient: to !== actualRecipient ? to : undefined },
        });
        
        const [response] = await sgMail.send({
          from: process.env.SENDGRID_FROM_EMAIL || 'Newskoop <no-reply@newskoop.co.za>',
          to: actualRecipient,
          subject: actualSubject,
          html,
        });
        
        // Update email log with success
        if (emailLog) {
          await logEmail({
            to: actualRecipient,
            from: process.env.SENDGRID_FROM_EMAIL || 'Newskoop <no-reply@newskoop.co.za>',
            subject: actualSubject,
            type,
            userId,
            status: 'SENT',
            providerId: response.headers['x-message-id'],
            metadata: { originalRecipient: to !== actualRecipient ? to : undefined },
          });
        }
      } catch (error) {
        console.error('Failed to send email:', error);
        
        // Log email failure
        await logEmail({
          to: actualRecipient,
          from: process.env.SENDGRID_FROM_EMAIL || 'Newskoop <no-reply@newskoop.co.za>',
          subject: actualSubject,
          type,
          userId,
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          metadata: { error: error instanceof Error ? error.stack : error },
        });
        
        throw new Error('Failed to send email');
      }
      break;
      
    default:
      throw new Error(`Unknown email mode: ${config.mode}`);
  }
}

export function generateWelcomeEmail(name: string, temporaryPassword: string) {
  return {
    subject: 'Welcome to Newskoop',
    type: 'WELCOME' as EmailType,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Welcome to Newskoop!</h1>
        
        <p>Hi ${name},</p>
        
        <p>Your account has been created on the Newskoop platform. Here are your login details:</p>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        </div>
        
        <p>For security reasons, you'll be required to change your password when you first log in.</p>
        
        <p>
          <a 
            href="${process.env.NEXT_PUBLIC_APP_URL}/login" 
            style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;"
          >
            Login to Newskoop
          </a>
        </p>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>The Newskoop Team</p>
      </div>
    `,
  };
}

export function generatePasswordResetEmail(name: string, resetToken: string) {
  return {
    subject: 'Reset Your Newskoop Password',
    type: 'PASSWORD_RESET' as EmailType,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Reset Your Password</h1>
        
        <p>Hi ${name},</p>
        
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <p style="margin: 20px 0;">
          <a 
            href="${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password?token=${resetToken}" 
            style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;"
          >
            Reset Password
          </a>
        </p>
        
        <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        
        <p>Best regards,<br>The Newskoop Team</p>
      </div>
    `,
  };
}

interface SendMagicLinkParams {
  email: string;
  token: string;
  name: string;
  isPrimary: boolean;
}

export async function sendMagicLink({ email, token, name, isPrimary }: SendMagicLinkParams) {
  const magicLink = generateMagicLink(token);
  
  const subject = isPrimary 
    ? 'Welcome to NewsKoop - Set Up Your Primary Account'
    : 'Welcome to NewsKoop - Set Up Your Account';
    
  const html = `
      <div>
        <h1>Welcome to NewsKoop${isPrimary ? ' as Primary Contact' : ''}!</h1>
        <p>Hello ${name},</p>
        <p>You have been ${isPrimary ? 'registered as the primary contact' : 'added as a user'} for your radio station on NewsKoop.</p>
        <p>To get started, please click the link below to set up your password:</p>
        <p>
          <a href="${magicLink}" style="
            display: inline-block;
            background-color: #66cc33;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 16px 0;
          ">
            Set Up Your Account
          </a>
        </p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>The NewsKoop Team</p>
      </div>
    `;
  
  try {
    await sendEmail({ 
      to: email, 
      subject, 
      html,
      type: 'MAGIC_LINK',
      userId: undefined, // We don't have userId in this context
    });
  } catch (error) {
    console.error('Error sending magic link email:', error);
    throw new Error('Failed to send magic link email');
  }
} 