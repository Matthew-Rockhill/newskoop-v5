import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/announcements - Get all announcements (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin privileges
    if (!session?.user || session.user.userType !== 'STAFF' || 
        !['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole || '')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;

    // Get total count
    const total = await prisma.announcement.count();

    // Get announcements with author information
    const announcements = await prisma.announcement.findMany({
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
        _count: {
          select: {
            dismissals: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// POST /api/admin/announcements - Create new announcement (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin privileges
    if (!session?.user || session.user.userType !== 'STAFF' || 
        !['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole || '')) {
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
        priority: priority || 'MEDIUM',
        targetAudience: targetAudience || 'ALL',
        authorId: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
      },
    });

    return NextResponse.json(announcement, { status: 201 });

  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}