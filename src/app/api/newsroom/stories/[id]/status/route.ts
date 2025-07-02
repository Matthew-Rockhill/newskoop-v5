import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { storyStatusUpdateSchema } from '@/lib/validations';
import { StoryStatus } from '@prisma/client';

// Helper function to check workflow permissions
function canUpdateStatus(userRole: string, currentStatus: StoryStatus, newStatus: StoryStatus) {
  const workflows = {
    INTERN: {
      allowed: [StoryStatus.DRAFT, StoryStatus.IN_REVIEW],
      transitions: {
        [StoryStatus.DRAFT]: [StoryStatus.IN_REVIEW],
        [StoryStatus.NEEDS_REVISION]: [StoryStatus.IN_REVIEW],
      }
    },
    JOURNALIST: {
      allowed: [StoryStatus.DRAFT, StoryStatus.IN_REVIEW, StoryStatus.NEEDS_REVISION, StoryStatus.APPROVED],
      transitions: {
        [StoryStatus.DRAFT]: [StoryStatus.IN_REVIEW],
        [StoryStatus.IN_REVIEW]: [StoryStatus.NEEDS_REVISION, StoryStatus.APPROVED],
        [StoryStatus.NEEDS_REVISION]: [StoryStatus.IN_REVIEW],
        [StoryStatus.APPROVED]: [StoryStatus.NEEDS_REVISION],
      }
    },
    SUB_EDITOR: {
      allowed: [StoryStatus.DRAFT, StoryStatus.IN_REVIEW, StoryStatus.NEEDS_REVISION, StoryStatus.APPROVED, StoryStatus.PUBLISHED],
      transitions: {
        [StoryStatus.DRAFT]: [StoryStatus.IN_REVIEW],
        [StoryStatus.IN_REVIEW]: [StoryStatus.NEEDS_REVISION, StoryStatus.APPROVED],
        [StoryStatus.NEEDS_REVISION]: [StoryStatus.IN_REVIEW],
        [StoryStatus.APPROVED]: [StoryStatus.PUBLISHED, StoryStatus.NEEDS_REVISION],
      }
    },
    EDITOR: {
      allowed: Object.values(StoryStatus),
      transitions: {
        [StoryStatus.DRAFT]: [StoryStatus.IN_REVIEW, StoryStatus.APPROVED],
        [StoryStatus.IN_REVIEW]: [StoryStatus.NEEDS_REVISION, StoryStatus.APPROVED],
        [StoryStatus.NEEDS_REVISION]: [StoryStatus.IN_REVIEW, StoryStatus.APPROVED],
        [StoryStatus.APPROVED]: [StoryStatus.PUBLISHED, StoryStatus.NEEDS_REVISION, StoryStatus.ARCHIVED],
        [StoryStatus.PUBLISHED]: [StoryStatus.ARCHIVED],
      }
    },
    ADMIN: {
      allowed: Object.values(StoryStatus),
      transitions: {
        [StoryStatus.DRAFT]: Object.values(StoryStatus),
        [StoryStatus.IN_REVIEW]: Object.values(StoryStatus),
        [StoryStatus.NEEDS_REVISION]: Object.values(StoryStatus),
        [StoryStatus.APPROVED]: Object.values(StoryStatus),
        [StoryStatus.PUBLISHED]: Object.values(StoryStatus),
        [StoryStatus.ARCHIVED]: Object.values(StoryStatus),
      }
    },
    SUPERADMIN: {
      allowed: Object.values(StoryStatus),
      transitions: {
        [StoryStatus.DRAFT]: Object.values(StoryStatus),
        [StoryStatus.IN_REVIEW]: Object.values(StoryStatus),
        [StoryStatus.NEEDS_REVISION]: Object.values(StoryStatus),
        [StoryStatus.APPROVED]: Object.values(StoryStatus),
        [StoryStatus.PUBLISHED]: Object.values(StoryStatus),
        [StoryStatus.ARCHIVED]: Object.values(StoryStatus),
      }
    }
  };

  const userWorkflow = workflows[userRole as keyof typeof workflows];
  if (!userWorkflow) return false;

  const allowedTransitions = userWorkflow.transitions[currentStatus];
  return allowedTransitions?.includes(newStatus) || false;
}

// PATCH /api/newsroom/stories/[id]/status - Update story status
const updateStoryStatus = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as any).user;
    const { status, assignedToId, reviewerId } = (req as any).validatedData;

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
      return Response.json({ error: 'Story not found' }, { status: 404 });
    }

    // Check if user can update this story's status
    if (!canUpdateStatus(user.staffRole, story.status, status)) {
      return Response.json({ 
        error: `Cannot transition from ${story.status} to ${status}` 
      }, { status: 403 });
    }

    // Role-based access control for story ownership
    if (user.staffRole === 'INTERN' && story.authorId !== user.id) {
      return Response.json({ error: 'Can only update own stories' }, { status: 403 });
    }

    if (user.staffRole === 'JOURNALIST') {
      const hasAccess = story.authorId === user.id || 
                       story.assignedToId === user.id || 
                       story.reviewerId === user.id;
      if (!hasAccess) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Prepare update data
    const updateData: any = {
      status,
      ...(assignedToId && { assignedToId }),
      ...(reviewerId && { reviewerId }),
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

    const updatedStory = await prisma.story.update({
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

    return Response.json(updatedStory);
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(storyStatusUpdateSchema),
  ]
);

export { updateStoryStatus as PATCH }; 