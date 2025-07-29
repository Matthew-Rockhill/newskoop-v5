import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { sendMagicLink } from '@/lib/email';

interface CreateMagicLinkParams {
  userId: string;
  email: string;
  name: string;
  isPrimary?: boolean;
}

export async function createAndSendMagicLink({
  userId,
  email,
  name,
  isPrimary = false,
}: CreateMagicLinkParams): Promise<{ sent: boolean; error?: string }> {
  try {
    // Generate a unique token
    const token = generateToken();
    
    // Store the token with expiration (24 hours)
    await prisma.user.update({
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