import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation } from '@/lib/api-handler';
import { storyStatusUpdateSchema } from '@/lib/validations';
import { StoryStatus, StaffRole } from '@prisma/client';
import { canUpdateStoryStatus } from '@/lib/permissions';
import { publishStoryEvent, publishDashboardEvent, createEvent } from '@/lib/ably';

// Helper function to check workflow permissions
function canUpdateStatus(userRole: string | null, currentStatus: StoryStatus, newStatus: StoryStatus, storyAuthorId?: string, currentUserId?: string) {
  if (!userRole) return false;
  return canUpdateStoryStatus(userRole as StaffRole, currentStatus, newStatus);
}

// PATCH /api/newsroom/stories/[id]/status - Update story status
const updateStoryStatus = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const { status, assignedToId, reviewerId, categoryId, language, tagIds } = (req as NextRequest & { validatedData: { status: string; assignedToId?: string; reviewerId?: string; categoryId?: string; language?: string; tagIds?: string[] } }).validatedData;

    // Get current story
    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        authorId: true,
        assignedToId: true,
        reviewerId: true,
        title: true,
      },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    console.log(`🔄 Status Update Request:`, {
      storyId: id,
      currentStatus: story.status,
      newStatus: status,
      userRole: user.staffRole,
      userId: user.id,
      storyAuthorId: story.authorId,
      reviewerId: reviewerId,
    });

    // Check if user can update this story's status
    const canUpdate = canUpdateStatus(user.staffRole, story.status, status as StoryStatus, story.authorId, user.id);
    console.log(`🔐 Permission Check:`, { canUpdate, userRole: user.staffRole, currentStatus: story.status, newStatus: status });
    
    if (!canUpdate) {
      console.error(`❌ Permission denied: Cannot transition from ${story.status} to ${status} for role ${user.staffRole}`);
      return NextResponse.json({ 
        error: `Cannot transition from ${story.status} to ${status}` 
      }, { status: 403 });
    }

    // Role-based access control for story ownership
    if (user.staffRole === 'INTERN' && story.authorId !== user.id) {
      return NextResponse.json({ error: 'Can only update own stories' }, { status: 403 });
    }

    if (user.staffRole === 'JOURNALIST') {
      const hasAccess = story.authorId === user.id || 
                       story.assignedToId === user.id || 
                       story.reviewerId === user.id;
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status,
      ...(assignedToId && { assignedToId }),
      ...(reviewerId && { reviewerId }),
      ...(categoryId && { categoryId }),
      ...(language && { language }),
    };

    // Set publisher info when publishing
    if (status === StoryStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
      updateData.publishedBy = user.id;
    }

    // Clear published info if moving away from published
    if (story.status === StoryStatus.PUBLISHED && status !== StoryStatus.PUBLISHED) {
      updateData.publishedAt = null;
      updateData.publishedBy = null;
    }

    // Use a transaction to update story and tags
    const updatedStory = await prisma.$transaction(async (tx) => {
      // Update story
      const story = await tx.story.update({
        where: { id },
        data: updateData,
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
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              staffRole: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              staffRole: true,
            },
          },
          publisher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              staffRole: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
            },
          },
        },
      });

      // Update tags if provided
      if (tagIds && Array.isArray(tagIds)) {
        // Remove existing tags
        await tx.storyTag.deleteMany({
          where: { storyId: id },
        });

        // Add new tags
        if (tagIds.length > 0) {
          await tx.storyTag.createMany({
            data: tagIds.map(tagId => ({
              storyId: id,
              tagId,
            })),
          });
        }
      }

      return story;
    });

    // Create audit log with detailed information
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'story.status_update',
        entityType: 'Story',
        entityId: id,
        metadata: {
          previousStatus: story.status,
          newStatus: status,
          storyTitle: story.title,
          assignedToId,
          reviewerId,
        },
      },
    });

    // Publish real-time events (non-blocking)
    publishStoryEvent(
      createEvent('story:stage_changed', 'story', id, user.id, undefined, {
        previousStage: story.status,
        newStage: status,
      })
    ).catch(() => {});

    publishDashboardEvent(
      createEvent('dashboard:metrics_updated', 'story', id, user.id, undefined, {
        trigger: 'status_change',
      })
    ).catch(() => {});

    return NextResponse.json(updatedStory);
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(storyStatusUpdateSchema),
  ]
);

export { updateStoryStatus as PATCH }; 