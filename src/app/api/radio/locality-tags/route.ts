import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/locality-tags - Get locality tags (provinces)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is a radio user
    if (!session?.user || session.user.userType !== 'RADIO') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all locality tags (provinces)
    const localities = await prisma.tag.findMany({
      where: {
        category: 'LOCALITY',
        isPreset: true,
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
    console.error('Error fetching locality tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locality tags' },
      { status: 500 }
    );
  }
}