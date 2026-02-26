import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClassificationType } from '@prisma/client';

// GET /api/radio/locality-tags - Get locality classifications (provinces)
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a radio user
    if (!session?.user || session.user.userType !== 'RADIO') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all locality classifications (provinces)
    const localities = await prisma.classification.findMany({
      where: {
        type: ClassificationType.LOCALITY,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      localities,
    });

  } catch (error) {
    console.error('Error fetching locality classifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locality classifications' },
      { status: 500 }
    );
  }
}