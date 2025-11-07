import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/newsroom/stories/[id]/reassign
 * Reassign a story to a different reviewer or approver
 *
 * Body:
 * - type: 'reviewer' | 'approver'
 * - assignedToId: string (user ID to assign to)
 * - note: string (optional reassignment note)
 *
 * Access: SUB_EDITOR, EDITOR, ADMIN, SUPERADMIN only
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check authorization
    if (
      !session?.user ||
      session.user.userType !== 'STAFF' ||
      !['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole || '')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: storyId } = await params;
    const body = await req.json();
    const { type, assignedToId, note } = body;

    // Validate input
    if (!type || !['reviewer', 'approver'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid reassignment type' },
        { status: 400 }
      );
    }

    if (!assignedToId) {
      return NextResponse.json(
        { error: 'assignedToId is required' },
        { status: 400 }
      );
    }

    // Get the story
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        title: true,
        stage: true,
        assignedReviewerId: true,
        assignedApproverId: true,
      },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Verify the target user exists and has appropriate role
    const targetUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        staffRole: true,
        userType: true,
      },
    });

    if (!targetUser || targetUser.userType !== 'STAFF') {
      return NextResponse.json(
        { error: 'Target user not found or invalid' },
        { status: 400 }
      );
    }

    // Validate role matches assignment type
    if (type === 'reviewer') {
      if (story.stage !== 'NEEDS_JOURNALIST_REVIEW') {
        return NextResponse.json(
          { error: 'Story is not in review stage' },
          { status: 400 }
        );
      }

      if (targetUser.staffRole !== 'JOURNALIST') {
        return NextResponse.json(
          { error: 'Target user must be a journalist for reviewer assignment' },
          { status: 400 }
        );
      }

      // Update assignedReviewerId
      await prisma.story.update({
        where: { id: storyId },
        data: {
          assignedReviewerId: assignedToId,
        },
      });

      // Log audit event
      await logAudit({
        userId: session.user.id,
        action: 'STORY_REASSIGNED',
        targetType: 'STORY',
        targetId: storyId,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        details: {
          type: 'reviewer',
          previousReviewerId: story.assignedReviewerId,
          newReviewerId: assignedToId,
          note,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Story reassigned to ${targetUser.firstName} ${targetUser.lastName}`,
      });
    } else if (type === 'approver') {
      if (story.stage !== 'NEEDS_SUB_EDITOR_APPROVAL') {
        return NextResponse.json(
          { error: 'Story is not in approval stage' },
          { status: 400 }
        );
      }

      if (!['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(targetUser.staffRole || '')) {
        return NextResponse.json(
          { error: 'Target user must be a sub-editor or above for approver assignment' },
          { status: 400 }
        );
      }

      // Update assignedApproverId
      await prisma.story.update({
        where: { id: storyId },
        data: {
          assignedApproverId: assignedToId,
        },
      });

      // Log audit event
      await logAudit({
        userId: session.user.id,
        action: 'STORY_REASSIGNED',
        targetType: 'STORY',
        targetId: storyId,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        details: {
          type: 'approver',
          previousApproverId: story.assignedApproverId,
          newApproverId: assignedToId,
          note,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Story reassigned to ${targetUser.firstName} ${targetUser.lastName}`,
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Story reassignment error:', error);
    return NextResponse.json(
      { error: 'Failed to reassign story' },
      { status: 500 }
    );
  }
}
