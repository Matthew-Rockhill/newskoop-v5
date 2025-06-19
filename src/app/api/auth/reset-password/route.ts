import { NextRequest } from 'next/server';
import { createHandler, withErrorHandling } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { sendEmail, generatePasswordResetEmail } from '@/lib/email';
import { generateResetToken, verifyResetToken } from '@/lib/auth';
import { z } from 'zod';

// POST /api/auth/reset-password/request - Request a password reset
export const POST = createHandler(
  async (req: NextRequest) => {
    const schema = z.object({
      email: z.string().email(),
    });

    const { email } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return Response.json({ message: 'If an account exists, you will receive a password reset email' });
    }

    const resetToken = generateResetToken(user.id);

    // Store the reset token in the database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send password reset email
    try {
      const { subject, html } = generatePasswordResetEmail(user.name, resetToken);
      await sendEmail({
        to: user.email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return Response.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }

    return Response.json({ message: 'If an account exists, you will receive a password reset email' });
  },
  [withErrorHandling]
);

// PATCH /api/auth/reset-password - Reset password with token
export const PATCH = createHandler(
  async (req: NextRequest) => {
    const schema = z.object({
      token: z.string(),
      newPassword: z.string().min(8),
    });

    const { token, newPassword } = schema.parse(await req.json());

    // Verify the reset token
    const userId = verifyResetToken(token);
    if (!userId) {
      return Response.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Find the user and check if the token is still valid
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.resetToken || user.resetToken !== token || user.resetTokenExpiresAt < new Date()) {
      return Response.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Update the password and clear the reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
        mustChangePassword: false,
      },
    });

    return Response.json({ message: 'Password reset successfully' });
  },
  [withErrorHandling]
); 