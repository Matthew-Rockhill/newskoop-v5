import sgMail from '@sendgrid/mail';
import { generateMagicLink } from './auth';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    await sgMail.send({
      from: 'Newskoop <no-reply@newskoop.co.za>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}

export function generateWelcomeEmail(name: string, temporaryPassword: string) {
  return {
    subject: 'Welcome to Newskoop',
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
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Reset Your Password</h1>
        
        <p>Hi ${name},</p>
        
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <p style="margin: 20px 0;">
          <a 
            href="${process.env.NEXT_PUBLIC_APP_URL}/password-reset?token=${resetToken}" 
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
  
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: isPrimary 
      ? 'Welcome to NewsKoop - Set Up Your Primary Account'
      : 'Welcome to NewsKoop - Set Up Your Account',
    html: `
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
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending magic link email:', error);
    throw new Error('Failed to send magic link email');
  }
} 