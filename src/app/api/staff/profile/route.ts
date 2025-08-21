import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  mobileNumber: z.string().optional(),
  defaultLanguagePreference: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow STAFF users to access this endpoint
    if (session.user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Access denied - STAFF users only' }, { status: 403 });
    }

    // Fetch user information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobileNumber: true,
        profilePictureUrl: true,
        defaultLanguagePreference: true,
        userType: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: user,
    });
  } catch (error) {
    console.error('Error fetching staff profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow STAFF users to access this endpoint
    if (session.user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Access denied - STAFF users only' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Validate language preference against available languages
    if (validatedData.defaultLanguagePreference) {
      const availableLanguages = ['English', 'Afrikaans', 'Xhosa'];
      
      if (!availableLanguages.includes(validatedData.defaultLanguagePreference)) {
        return NextResponse.json(
          { error: 'Selected language is not available' },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobileNumber: true,
        profilePictureUrl: true,
        defaultLanguagePreference: true,
        userType: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PROFILE_UPDATE',
        entityType: 'USER',
        entityId: session.user.id,
        metadata: {
          updatedFields: Object.keys(validatedData),
        },
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating staff profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}