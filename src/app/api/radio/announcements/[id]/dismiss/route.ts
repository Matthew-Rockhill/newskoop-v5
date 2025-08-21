import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/radio/announcements/[id]/dismiss - Dismiss an announcement for current user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    // Check if user has already dismissed this announcement
    const existingDismissal = await prisma.userAnnouncementDismissal.findUnique({
      where: {
        userId_announcementId: {
          userId: session.user.id,
          announcementId: id,
        },
      },
    });

    if (existingDismissal) {
      return NextResponse.json(
        { error: 'Announcement already dismissed' },
        { status: 400 }
      );
    }

    // Create dismissal record
    const dismissal = await prisma.userAnnouncementDismissal.create({
      data: {
        userId: session.user.id,
        announcementId: id,
      },
    });

    return NextResponse.json({
      message: 'Announcement dismissed successfully',
      dismissedAt: dismissal.dismissedAt,
    });

  } catch (error) {
    console.error('Error dismissing announcement:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss announcement' },
      { status: 500 }
    );
  }
}

// DELETE /api/radio/announcements/[id]/dismiss - Undo dismissal (for undo functionality)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if dismissal exists
    const dismissal = await prisma.userAnnouncementDismissal.findUnique({
      where: {
        userId_announcementId: {
          userId: session.user.id,
          announcementId: id,
        },
      },
    });

    if (!dismissal) {
      return NextResponse.json(
        { error: 'Dismissal not found' },
        { status: 404 }
      );
    }

    // Delete dismissal record (this will make the announcement visible again)
    await prisma.userAnnouncementDismissal.delete({
      where: {
        userId_announcementId: {
          userId: session.user.id,
          announcementId: id,
        },
      },
    });

    return NextResponse.json({
      message: 'Announcement dismissal undone successfully',
    });

  } catch (error) {
    console.error('Error undoing announcement dismissal:', error);
    return NextResponse.json(
      { error: 'Failed to undo dismissal' },
      { status: 500 }
    );
  }
}