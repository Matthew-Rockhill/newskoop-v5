import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAudit, logAuditTx } from '@/lib/audit';
import {
  canReviewStory,
  canApproveStoryStage,
  canSendForTranslation,
  canRequestRevision,
} from '@/lib/permissions';
import { StoryStage, StaffRole, ClassificationType } from '@prisma/client';

// Validation schema for stage transitions
const stageTransitionSchema = z.object({
  action: z.enum([
    'submit_for_review',
    'send_for_approval',
    'approve_story',
    'send_for_translation',
    'publish_story',
    'mark_as_translated',
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
        classifications: {
          include: {
            classification: {
              select: { id: true, name: true, type: true },
            },
          },
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
        if (story.author.staffRole !== 'INTERN') {
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

        if (story.author.staffRole === 'INTERN' && story.stage !== 'NEEDS_JOURNALIST_REVIEW') {
          return NextResponse.json(
            { error: `Cannot send for approval from ${story.stage} stage` },
            { status: 400 }
          );
        }

        if (story.author.staffRole === 'JOURNALIST' && story.stage !== 'DRAFT') {
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
          !(story.stage === 'DRAFT' && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(story.author.staffRole!))
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

        // Check for required language classification
        const hasLanguageClassification = story.classifications.some(sc => sc.classification.type === ClassificationType.LANGUAGE);
        if (!hasLanguageClassification) {
          return NextResponse.json(
            { error: 'Story must have a language classification before approval' },
            { status: 400 }
          );
        }

        // Check for required religion classification
        const hasReligionClassification = story.classifications.some(sc => sc.classification.type === ClassificationType.RELIGION);
        if (!hasReligionClassification) {
          return NextResponse.json(
            { error: 'Story must have a religion classification before approval' },
            { status: 400 }
          );
        }

        // For translations, approve them as TRANSLATED instead of APPROVED
        // This makes translations ready for publishing immediately
        newStage = story.isTranslation ? 'TRANSLATED' : 'APPROVED';
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

      case 'mark_as_translated':
        // Mark APPROVED story as TRANSLATED when translations are complete
        if (!['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
          return NextResponse.json(
            { error: 'Insufficient permissions to mark as translated' },
            { status: 403 }
          );
        }

        if (story.stage !== 'APPROVED') {
          return NextResponse.json(
            { error: `Cannot mark as translated from ${story.stage} stage` },
            { status: 400 }
          );
        }

        newStage = 'TRANSLATED';
        updateData = {
          stage: newStage,
        };
        auditAction = 'MARK_AS_TRANSLATED';
        break;

      case 'publish_story':
        // Publish story (Sub-Editor and above)
        if (!['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
          return NextResponse.json(
            { error: 'Insufficient permissions to publish story' },
            { status: 403 }
          );
        }

        if (story.stage !== 'TRANSLATED') {
          return NextResponse.json(
            { error: `Cannot publish story from ${story.stage} stage. Story must be in TRANSLATED stage.` },
            { status: 400 }
          );
        }

        newStage = 'PUBLISHED';
        updateData = {
          stage: newStage,
          status: 'PUBLISHED', // Also update legacy status field for backwards compatibility
          publishedAt: new Date(),
          publishedBy: session.user.id,
          translationChecklist: validatedData.checklistData || {},
        };
        auditAction = 'PUBLISH_STORY';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update story in transaction
    const result = await prisma.$transaction(async (tx) => {
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

      // If we just published a story, also publish all its translations
      if (validatedData.action === 'publish_story' && !story.isTranslation) {
        // Find all translations for this story
        const translations = await tx.story.findMany({
          where: {
            originalStoryId: id,
            isTranslation: true,
          },
          select: { id: true },
        });

        // Publish all translations
        if (translations.length > 0) {
          await tx.story.updateMany({
            where: {
              id: { in: translations.map(t => t.id) },
            },
            data: {
              stage: 'PUBLISHED',
              status: 'PUBLISHED', // Also update legacy status field
              publishedAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Log audit for each translation (inside transaction for consistency)
          for (const translation of translations) {
            await logAuditTx(tx, {
              userId: session.user.id,
              action: 'AUTO_PUBLISH_TRANSLATION',
              details: {
                entityType: 'STORY',
                entityId: translation.id,
                trigger: 'Original story published',
                originalStoryId: id,
              },
              ipAddress:
                request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown',
              targetId: translation.id,
              targetType: 'STORY',
            });
          }
        }
      }

      // If we just approved a translation, check if all translations are approved
      // and auto-transition the original story to TRANSLATED stage
      if (validatedData.action === 'approve_story' && story.isTranslation && story.originalStoryId) {
        // Get all translations for this original story
        const allTranslations = await tx.story.findMany({
          where: {
            originalStoryId: story.originalStoryId,
            isTranslation: true,
          },
          select: {
            id: true,
            stage: true,
          },
        });

        // Check if all translations are approved or beyond
        const allTranslationsComplete = allTranslations.every(
          (t) => t.stage === 'APPROVED' || t.stage === 'TRANSLATED' || t.stage === 'PUBLISHED'
        );

        if (allTranslationsComplete) {
          // Get the original story
          const originalStory = await tx.story.findUnique({
            where: { id: story.originalStoryId },
            select: { id: true, stage: true },
          });

          // Auto-transition original to TRANSLATED if it's still at APPROVED
          if (originalStory && originalStory.stage === 'APPROVED') {
            await tx.story.update({
              where: { id: story.originalStoryId },
              data: {
                stage: 'TRANSLATED',
                updatedAt: new Date(),
              },
            });

            // Log audit for auto-transition (inside transaction for consistency)
            await logAuditTx(tx, {
              userId: session.user.id,
              action: 'AUTO_MARK_AS_TRANSLATED',
              details: {
                entityType: 'STORY',
                entityId: story.originalStoryId,
                previousStage: 'APPROVED',
                newStage: 'TRANSLATED',
                trigger: 'All translations approved',
                triggerStoryId: id,
              },
              ipAddress:
                request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown',
              targetId: story.originalStoryId,
              targetType: 'STORY',
            });
          }
        }
      }

      // Log main audit trail (inside transaction for consistency)
      await logAuditTx(tx, {
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

      return updatedStory;
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
