import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AnnouncementTargetAudience } from '@prisma/client';

// GET /api/radio/announcements - Get active announcements for radio users (excluding dismissed ones)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '10');
    const skip = (page - 1) * perPage;

    // Get announcements targeting RADIO or ALL, that are active, not expired, and not dismissed by this user
    const whereClause = {
      isActive: true,
      targetAudience: {
        in: [AnnouncementTargetAudience.RADIO, AnnouncementTargetAudience.ALL],
      },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ],
      // Exclude announcements dismissed by this user
      dismissals: {
        none: {
          userId: session.user.id,
        },
      },
    };

    const total = await prisma.announcement.count({
      where: whereClause,
    });

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            staffRole: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: perPage,
    });

    return NextResponse.json({
      announcements,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });

  } catch (error) {
    console.error('Error fetching radio announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}