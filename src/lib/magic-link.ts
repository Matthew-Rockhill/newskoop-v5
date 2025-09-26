import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { sendMagicLink } from '@/lib/email';
import { Prisma } from '@prisma/client';

interface CreateMagicLinkParams {
  userId: string;
  email: string;
  name: string;
  isPrimary?: boolean;
  tx?: Prisma.TransactionClient;
}

export async function createAndSendMagicLink({
  userId,
  email,
  name,
  isPrimary = false,
  tx,
}: CreateMagicLinkParams): Promise<{ sent: boolean; error?: string }> {
  try {
    // Generate a unique token
    const token = generateToken();

    // WARNING: Using resetToken field for magic links creates potential conflicts
    // with password reset functionality. Both systems will overwrite each other's tokens.
    // TODO: Add separate magicLinkToken and magicLinkTokenExpiresAt fields to User model

    // Use transaction client if provided, otherwise use default prisma client
    const client = tx || prisma;

    // Store the token with expiration (24 hours)
    await client.user.update({
      where: { id: userId },
      data: {
        resetToken: token,
        resetTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
    
    // Send the magic link email (with userId for tracking)
    await sendMagicLink({ email, token, name, isPrimary });
    
    return { sent: true, error: undefined };
  } catch (error) {
    console.error('Failed to create/send magic link:', error);
    return { 
      sent: false, 
      error: error instanceof Error ? error.message : 'Failed to send magic link' 
    };
  }
}