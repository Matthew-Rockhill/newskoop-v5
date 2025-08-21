import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AnnouncementTargetAudience } from '@prisma/client';

// GET /api/newsroom/announcements - Get announcements for newsroom staff
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated newsroom staff
    if (!session?.user || session.user.userType !== 'STAFF') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;

    // Get announcements targeting NEWSROOM or ALL, that are active and not expired
    const whereClause = {
      isActive: true,
      targetAudience: {
        in: [AnnouncementTargetAudience.NEWSROOM, AnnouncementTargetAudience.ALL],
      },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ],
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
        dismissals: {
          where: {
            userId: session.user.id,
          },
          select: {
            dismissedAt: true,
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

    // Transform to include isDismissed flag
    const transformedAnnouncements = announcements.map(announcement => ({
      ...announcement,
      isDismissed: announcement.dismissals.length > 0,
      dismissals: undefined, // Remove dismissals array from response
    }));

    return NextResponse.json({
      announcements: transformedAnnouncements,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });

  } catch (error) {
    console.error('Error fetching newsroom announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// POST /api/newsroom/announcements - Create announcement (editors only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has editor privileges
    if (!session?.user || session.user.userType !== 'STAFF' || 
        !['SUPERADMIN', 'ADMIN', 'EDITOR'].includes(session.user.staffRole || '')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, message, priority, targetAudience, expiresAt } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Editors can only create MEDIUM priority announcements, admins can create any
    const allowedPriority = ['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole || '') 
      ? priority || 'MEDIUM'
      : 'MEDIUM';

    // Validate priority
    if (priority && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority level' },
        { status: 400 }
      );
    }

    // Validate target audience
    if (targetAudience && !['ALL', 'NEWSROOM', 'RADIO'].includes(targetAudience)) {
      return NextResponse.json(
        { error: 'Invalid target audience' },
        { status: 400 }
      );
    }

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        priority: allowedPriority,
        targetAudience: targetAudience || 'NEWSROOM',
        authorId: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
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
    });

    return NextResponse.json(announcement, { status: 201 });

  } catch (error) {
    console.error('Error creating newsroom announcement:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}