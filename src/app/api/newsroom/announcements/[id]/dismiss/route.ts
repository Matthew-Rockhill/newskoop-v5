import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/newsroom/announcements/[id]/dismiss - Dismiss an announcement for current user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.userType !== 'STAFF') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

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

// DELETE /api/newsroom/announcements/[id]/dismiss - Undo dismissal
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.userType !== 'STAFF') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
