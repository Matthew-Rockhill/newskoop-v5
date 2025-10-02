import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  canReviewStory,
  canApproveStoryStage,
  canSendForTranslation,
  canRequestRevision,
} from '@/lib/permissions';
import { StoryStage, StaffRole } from '@prisma/client';

// Validation schema for stage transitions
const stageTransitionSchema = z.object({
  action: z.enum([
    'submit_for_review',
    'send_for_approval',
    'approve_story',
    'send_for_translation',
    'publish_story',
  ]),
  assignedUserId: z.string().optional(),
  checklistData: z.record(z.boolean()).optional(),
  translationLanguages: z.array(z.object({
    language: z.string(),
    translatorId: z.string(),
  })).optional(),
});

/**
 * POST /api/newsroom/stories/[id]/stage
 * Transition story to next stage
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
    const validatedData = stageTransitionSchema.parse(body);

    // Get current story
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, staffRole: true },
        },
        assignedReviewer: {
          select: { id: true, firstName: true, lastName: true, staffRole: true },
        },
        assignedApprover: {
          select: { id: true, firstName: true, lastName: true, staffRole: true },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Process the action
    let newStage: StoryStage | null = null;
    let updateData: any = {};
    let auditAction = '';
    let auditDetails: any = {};

    switch (validatedData.action) {
      case 'submit_for_review':
        // Intern submitting for journalist review
        if (story.authorRole !== 'INTERN') {
          return NextResponse.json(
            { error: 'Only intern stories need journalist review' },
            { status: 400 }
          );
        }

        if (story.stage !== 'DRAFT') {
          return NextResponse.json(
            { error: `Cannot submit for review from ${story.stage} stage` },
            { status: 400 }
          );
        }

        if (!validatedData.assignedUserId) {
          return NextResponse.json(
            { error: 'Must assign a journalist for review' },
            { status: 400 }
          );
        }

        newStage = 'NEEDS_JOURNALIST_REVIEW';
        updateData = {
          stage: newStage,
          assignedReviewerId: validatedData.assignedUserId,
          authorChecklist: validatedData.checklistData || {},
        };
        auditAction = 'SUBMIT_FOR_REVIEW';
        auditDetails = { assignedReviewerId: validatedData.assignedUserId };
        break;

      case 'send_for_approval':
        // Journalist sending to sub-editor for approval
        if (!canReviewStory(userRole)) {
          return NextResponse.json(
            { error: 'Insufficient permissions to send for approval' },
            { status: 403 }
          );
        }

        if (story.authorRole === 'INTERN' && story.stage !== 'NEEDS_JOURNALIST_REVIEW') {
          return NextResponse.json(
            { error: `Cannot send for approval from ${story.stage} stage` },
            { status: 400 }
          );
        }

        if (story.authorRole === 'JOURNALIST' && story.stage !== 'DRAFT') {
          return NextResponse.json(
            { error: `Cannot send for approval from ${story.stage} stage` },
            { status: 400 }
          );
        }

        if (!validatedData.assignedUserId) {
          return NextResponse.json(
            { error: 'Must assign a sub-editor for approval' },
            { status: 400 }
          );
        }

        newStage = 'NEEDS_SUB_EDITOR_APPROVAL';
        updateData = {
          stage: newStage,
          assignedApproverId: validatedData.assignedUserId,
          reviewerChecklist: validatedData.checklistData || {},
        };
        auditAction = 'SEND_FOR_APPROVAL';
        auditDetails = { assignedApproverId: validatedData.assignedUserId };
        break;

      case 'approve_story':
        // Sub-editor approving story
        if (!canApproveStoryStage(userRole)) {
          return NextResponse.json(
            { error: 'Insufficient permissions to approve story' },
            { status: 403 }
          );
        }

        if (
          story.stage !== 'NEEDS_SUB_EDITOR_APPROVAL' &&
          !(story.stage === 'DRAFT' && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(story.authorRole!))
        ) {
          return NextResponse.json(
            { error: `Cannot approve story from ${story.stage} stage` },
            { status: 400 }
          );
        }

        // Validate that category and tags are assigned
        if (!story.categoryId) {
          return NextResponse.json(
            { error: 'Story must have a category before approval' },
            { status: 400 }
          );
        }

        newStage = 'APPROVED';
        updateData = {
          stage: newStage,
          approverChecklist: validatedData.checklistData || {},
        };
        auditAction = 'APPROVE_STORY';
        break;

      case 'send_for_translation':
        // Sub-editor sending for translation
        if (!canSendForTranslation(userRole)) {
          return NextResponse.json(
            { error: 'Insufficient permissions to send for translation' },
            { status: 403 }
          );
        }

        if (story.stage !== 'APPROVED') {
          return NextResponse.json(
            { error: `Cannot send for translation from ${story.stage} stage` },
            { status: 400 }
          );
        }

        if (!validatedData.translationLanguages || validatedData.translationLanguages.length === 0) {
          return NextResponse.json(
            { error: 'Must specify translation languages and translators' },
            { status: 400 }
          );
        }

        // Will be handled in transaction below
        newStage = 'TRANSLATED';
        auditAction = 'SEND_FOR_TRANSLATION';
        auditDetails = {
          languages: validatedData.translationLanguages.map(t => t.language),
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update story in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Handle translation creation separately
      if (validatedData.action === 'send_for_translation' && validatedData.translationLanguages) {
        // Create translation requests
        for (const translation of validatedData.translationLanguages) {
          await tx.translation.create({
            data: {
              originalStoryId: id,
              assignedToId: translation.translatorId,
              targetLanguage: translation.language as any,
              status: 'PENDING',
            },
          });
        }

        // Update story to APPROVED stage (translations will handle moving to TRANSLATED)
        updateData = {
          stage: 'APPROVED',
        };
      }

      const updatedStory = await tx.story.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, staffRole: true },
          },
          assignedReviewer: {
            select: { id: true, firstName: true, lastName: true, staffRole: true },
          },
          assignedApprover: {
            select: { id: true, firstName: true, lastName: true, staffRole: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      return updatedStory;
    });

    // Log audit trail
    await logAudit({
      userId: session.user.id,
      action: auditAction,
      details: {
        entityType: 'STORY',
        entityId: id,
        storyTitle: story.title,
        previousStage: story.stage,
        newStage,
        ...auditDetails,
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
      message: 'Stage transition successful',
      story: result,
    });
  } catch (error: unknown) {
    console.error('Error transitioning story stage:', error);

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
      error instanceof Error ? error.message : 'Failed to transition story stage';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
