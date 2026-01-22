import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { canFlagStoryForBulletin } from '@/lib/permissions';
import { StaffRole } from '@prisma/client';

// POST /api/newsroom/stories/[id]/flag - Toggle bulletin flag on a story
const toggleBulletinFlag = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    // Parse request body
    const body = await req.json();
    const { flagged } = body;

    if (typeof flagged !== 'boolean') {
      return NextResponse.json(
        { error: 'flagged field must be a boolean' },
        { status: 400 }
      );
    }

    // Check permission
    if (!canFlagStoryForBulletin(user.staffRole as StaffRole)) {
      return NextResponse.json(
        { error: 'Only Sub-editors and above can flag stories for bulletin' },
        { status: 403 }
      );
    }

    // Get current story to verify it exists
    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        flaggedForBulletin: true,
      },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Update the flag
    const updatedStory = await prisma.story.update({
      where: { id },
      data: {
        flaggedForBulletin: flagged,
        flaggedForBulletinAt: flagged ? new Date() : null,
        flaggedForBulletinById: flagged ? user.id : null,
      },
      select: {
        id: true,
        flaggedForBulletin: true,
        flaggedForBulletinAt: true,
        flaggedForBulletinBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: flagged ? 'story.flagged_for_bulletin' : 'story.unflagged_for_bulletin',
        entityType: 'Story',
        entityId: id,
        metadata: {
          storyTitle: story.title,
          flagged,
        },
      },
    });

    return NextResponse.json(updatedStory);
  },
  [withErrorHandling, withAuth]
);

export { toggleBulletinFlag as POST };
