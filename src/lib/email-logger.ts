import { prisma } from '@/lib/prisma';
import { EmailType, EmailStatus } from '@prisma/client';

interface LogEmailParams {
  to: string;
  from?: string;
  subject: string;
  type: EmailType;
  userId?: string;
  metadata?: any;
  status?: EmailStatus;
  providerId?: string;
  failureReason?: string;
}

export async function logEmail({
  to,
  from,
  subject,
  type,
  userId,
  metadata,
  status = 'PENDING',
  providerId,
  failureReason,
}: LogEmailParams) {
  try {
    const emailLog = await prisma.emailLog.create({
      data: {
        to,
        from,
        subject,
        type,
        status,
        userId,
        providerId,
        metadata,
        failureReason,
        environment: process.env.NODE_ENV || 'development',
        sentAt: status === 'SENT' ? new Date() : undefined,
        failedAt: status === 'FAILED' ? new Date() : undefined,
      },
    });
    
    return emailLog;
  } catch (error) {
    console.error('Failed to log email:', error);
    // Don't throw - email logging shouldn't break the email flow
    return null;
  }
}

export async function updateEmailStatus(
  emailLogId: string,
  status: EmailStatus,
  updates?: {
    providerId?: string;
    failureReason?: string;
    metadata?: any;
  }
) {
  try {
    const updateData: any = {
      status,
      ...updates,
    };
    
    if (status === 'SENT') {
      updateData.sentAt = new Date();
    } else if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    } else if (status === 'FAILED' || status === 'BOUNCED') {
      updateData.failedAt = new Date();
    }
    
    const emailLog = await prisma.emailLog.update({
      where: { id: emailLogId },
      data: updateData,
    });
    
    return emailLog;
  } catch (error) {
    console.error('Failed to update email status:', error);
    return null;
  }
}