import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyResetToken } from '@/lib/auth';
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

    // Verify the token
    const userId = verifyResetToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Find the user and check if the token is still valid
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.resetToken || user.resetToken !== token) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Check token expiration
    if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Token has expired' },
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