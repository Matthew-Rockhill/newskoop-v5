import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, generatePasswordResetEmail } from '@/lib/email';
import { generateResetToken, verifyResetToken } from '@/lib/auth';
import { z } from 'zod';

// POST /api/auth/reset-password/request - Request a password reset
export async function POST(req: NextRequest) {
  try {
    const schema = z.object({
      email: z.string().email(),
    });

    const { email } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({ message: 'If an account exists, you will receive a password reset email' });
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
      const { subject, html } = generatePasswordResetEmail(`${user.firstName} ${user.lastName}`, resetToken);
      await sendEmail({
        to: user.email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'If an account exists, you will receive a password reset email' });
  } catch (error) {
    console.error('Error in password reset request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/reset-password - Reset password with token
export async function PATCH(req: NextRequest) {
  try {
    const schema = z.object({
      token: z.string(),
      newPassword: z.string().min(8),
    });

    const { token, newPassword } = schema.parse(await req.json());

    // Verify the reset token
    const userId = verifyResetToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Find the user and check if the token is still valid
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.resetToken || user.resetToken !== token || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      return NextResponse.json(
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

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error in password reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 