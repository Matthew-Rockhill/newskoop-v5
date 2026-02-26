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

    // Fetch user with station information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        radioStation: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle different user types
    let station = null;
    if (session.user.userType === 'RADIO') {
      station = user.radioStation;
    } else if (session.user.userType === 'STAFF') {
      // Provide a mock station for staff users to preview radio interface
      station = {
        id: 'staff-access',
        name: 'Newskoop',
        allowedLanguages: ['English', 'Afrikaans', 'Xhosa'],
        hasContentAccess: true,
        isActive: true,
        province: 'GAUTENG',
        description: 'Staff preview mode with full content access',
        logoUrl: null,
        contactNumber: null,
        contactEmail: null,
        website: null,
        allowedReligions: ['Christian', 'Muslim', 'Neutral'],
        blockedCategories: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Remove sensitive information
    const { password: _password, resetToken: _resetToken, resetTokenExpiresAt: _resetTokenExpiresAt, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      station: station,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
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

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Validate language preference against allowed languages
    if (validatedData.defaultLanguagePreference) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { radioStation: true },
      });

      // For RADIO users, check against station's allowed languages
      // For STAFF users, allow any of the standard languages
      const allowedLanguages = session.user.userType === 'RADIO' && user?.radioStation
        ? user.radioStation.allowedLanguages
        : ['English', 'Afrikaans', 'Xhosa'];

      if (!allowedLanguages.includes(validatedData.defaultLanguagePreference)) {
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
      include: {
        radioStation: true,
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

    // Remove sensitive information
    const { password: _password2, resetToken: _resetToken2, resetTokenExpiresAt: _resetTokenExpiresAt2, ...safeUser } = updatedUser;

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: safeUser,
      station: updatedUser.radioStation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}