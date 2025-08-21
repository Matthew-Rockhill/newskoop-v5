import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/announcements/[id] - Get specific announcement
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin privileges
    if (!session?.user || session.user.userType !== 'STAFF' || 
        !['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole || '')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
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
    });

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(announcement);

  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcement' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/announcements/[id] - Update announcement
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { title, message, priority, targetAudience, isActive, expiresAt } = body;

    // Check if announcement exists
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    // Validate fields if provided
    if (priority && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority level' },
        { status: 400 }
      );
    }

    if (targetAudience && !['ALL', 'NEWSROOM', 'RADIO'].includes(targetAudience)) {
      return NextResponse.json(
        { error: 'Invalid target audience' },
        { status: 400 }
      );
    }

    // Update announcement
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(priority !== undefined && { priority }),
        ...(targetAudience !== undefined && { targetAudience }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
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
        _count: {
          select: {
            dismissals: true,
          },
        },
      },
    });

    return NextResponse.json(announcement);

  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/announcements/[id] - Delete announcement
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin privileges
    if (!session?.user || session.user.userType !== 'STAFF' || 
        !['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole || '')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if announcement exists
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    // Delete announcement (this will cascade delete dismissals)
    await prisma.announcement.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Announcement deleted successfully' });

  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}