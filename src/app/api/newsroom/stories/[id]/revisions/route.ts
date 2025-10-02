import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { canRequestRevision } from '@/lib/permissions';
import { StaffRole } from '@prisma/client';

// Validation schema for revision requests
const revisionRequestSchema = z.object({
  assignedToId: z.string().min(1, 'Must assign revision to a user'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

/**
 * POST /api/newsroom/stories/[id]/revisions
 * Request revision on a story
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.staffRole as StaffRole | null;
    if (!userRole) {
      return NextResponse.json({ error: 'User has no staff role' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = revisionRequestSchema.parse(body);

    // Get current story
    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        stage: true,
        authorId: true,
        assignedReviewerId: true,
        assignedApproverId: true,
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Check permissions
    if (
      !canRequestRevision(
        userRole,
        story.stage,
        story.assignedReviewerId,
        story.assignedApproverId,
        session.user.id
      )
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions to request revision' },
        { status: 403 }
      );
    }

    // Verify assigned user exists
    const assignedUser = await prisma.user.findUnique({
      where: { id: validatedData.assignedToId },
      select: { id: true, firstName: true, lastName: true, staffRole: true },
    });

    if (!assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
    }

    // Create revision request and move story back to DRAFT in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create revision request
      const revisionRequest = await tx.revisionRequest.create({
        data: {
          storyId: id,
          requestedById: session.user.id,
          requestedByRole: userRole,
          assignedToId: validatedData.assignedToId,
          reason: validatedData.reason,
        },
        include: {
          requestedBy: {
            select: { id: true, firstName: true, lastName: true, staffRole: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, staffRole: true },
          },
        },
      });

      // Move story back to DRAFT
      const updatedStory = await tx.story.update({
        where: { id },
        data: {
          stage: 'DRAFT',
          assignedReviewerId: null, // Clear assignments
          assignedApproverId: null,
          updatedAt: new Date(),
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return { revisionRequest, updatedStory };
    });

    // Log audit trail
    await logAudit({
      userId: session.user.id,
      action: 'REQUEST_REVISION',
      details: {
        entityType: 'STORY',
        entityId: id,
        storyTitle: story.title,
        previousStage: story.stage,
        assignedToId: validatedData.assignedToId,
        assignedToName: `${assignedUser.firstName} ${assignedUser.lastName}`,
        reason: validatedData.reason,
      },
      ipAddress:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      targetId: id,
      targetType: 'STORY',
    });

    return NextResponse.json({
      message: 'Revision requested successfully',
      revisionRequest: result.revisionRequest,
      story: result.updatedStory,
    });
  } catch (error: unknown) {
    console.error('Error requesting revision:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to request revision';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/newsroom/stories/[id]/revisions
 * Get all revision requests for a story
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const revisionRequests = await prisma.revisionRequest.findMany({
      where: { storyId: id },
      include: {
        requestedBy: {
          select: { id: true, firstName: true, lastName: true, staffRole: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, staffRole: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ revisionRequests });
  } catch (error: unknown) {
    console.error('Error fetching revision requests:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch revision requests';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * PATCH /api/newsroom/stories/[id]/revisions
 * Mark revision requests as resolved
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get story to check author
    const story = await prisma.story.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Only the author can mark revisions as resolved
    if (story.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the story author can resolve revision requests' },
        { status: 403 }
      );
    }

    // Mark all unresolved revision requests as resolved
    const result = await prisma.revisionRequest.updateMany({
      where: {
        storyId: id,
        resolvedAt: null,
      },
      data: {
        resolvedAt: new Date(),
      },
    });

    // Log audit trail
    await logAudit({
      userId: session.user.id,
      action: 'RESOLVE_REVISIONS',
      details: {
        entityType: 'STORY',
        entityId: id,
        resolvedCount: result.count,
      },
      ipAddress:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      targetId: id,
      targetType: 'STORY',
    });

    return NextResponse.json({
      message: 'Revision requests resolved',
      resolvedCount: result.count,
    });
  } catch (error: unknown) {
    console.error('Error resolving revision requests:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to resolve revision requests';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
