import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// POST /api/auth/set-password - Set initial password with magic link token
export async function POST(req: NextRequest) {
  try {
    const schema = z.object({
      token: z.string(),
      password: z.string().min(8),
    });

    const { token, password } = schema.parse(await req.json());

    // Find user by reset token directly (magic links use random hex tokens, not JWTs)
    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token. The link may have been used already or has expired.' },
        { status: 400 }
      );
    }

    // Check token expiration
    if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This password reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password and clear the token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
        mustChangePassword: false, // Clear this flag since they're setting their password
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_SET',
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          method: 'magic_link',
        },
      },
    });

    return NextResponse.json({ 
      message: 'Password set successfully',
      success: true 
    });
  } catch (error) {
    console.error('Error setting password:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}