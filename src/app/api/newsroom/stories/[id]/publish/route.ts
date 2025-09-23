import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { canPublishStory, canUpdateStoryStatus } from '@/lib/permissions';
import { TranslationStatus } from '@prisma/client';

const publishSchema = z.object({
  followUpDate: z.string().optional().transform((str, ctx) => {
    if (!str || str.trim() === '') return undefined;
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid follow-up date format',
      });
      return z.NEVER;
    }
    return date;
  }),
  followUpNote: z.string().optional(),
  scheduledPublishAt: z.string().optional().transform((str, ctx) => {
    if (!str || str.trim() === '') return undefined;
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid scheduled publish date format',
      });
      return z.NEVER;
    }
    // Ensure scheduled date is in the future
    if (date <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Scheduled publish date must be in the future',
      });
      return z.NEVER;
    }
    return date;
  }),
  publishImmediately: z.boolean().default(true),
  
  // Pre-publish checklist items (for logging/audit purposes)
  contentReviewed: z.boolean().default(false),
  translationsVerified: z.boolean().default(false),
  audioQualityChecked: z.boolean().default(false),
});

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

    const userRole = session.user.staffRole ?? null;
    if (!canPublishStory(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = publishSchema.parse(body);

    // Get the story
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        author: true,
        category: true,
        translationRequests: {
          include: {
            assignedTo: true,
          }
        },
        audioClips: true,
      }
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Verify story can be published - must be in READY_TO_PUBLISH status
    if (story.status !== 'READY_TO_PUBLISH') {
      return NextResponse.json({ 
        error: `Story must be in READY_TO_PUBLISH status. Current status: ${story.status}. Ensure all translations are approved first.`
      }, { status: 400 });
    }

    // Verify user has permission to publish
    if (!canUpdateStoryStatus(userRole, story.status, 'PUBLISHED')) {
      return NextResponse.json({ 
        error: `Insufficient permissions to publish story` 
      }, { status: 403 });
    }

    // Double-check that story has required translations (should always be true for READY_TO_PUBLISH)
    if (story.translationRequests.length === 0) {
      return NextResponse.json({ 
        error: 'Story must have translations before publishing'
      }, { status: 400 });
    }

    // Double-check that all translations are approved (should always be true for READY_TO_PUBLISH)
    const pendingTranslations = story.translationRequests.filter(t => t.status !== 'APPROVED');
    if (pendingTranslations.length > 0) {
      return NextResponse.json({ 
        error: 'All translations must be approved before publishing',
        pendingTranslations: pendingTranslations.length
      }, { status: 400 });
    }

    // Determine publish date
    let publishDate: Date;
    if (validatedData.publishImmediately) {
      publishDate = new Date();
    } else {
      // If not publishing immediately, require a scheduled date
      if (!validatedData.scheduledPublishAt) {
        return NextResponse.json({
          error: 'Scheduled publish date is required when not publishing immediately'
        }, { status: 400 });
      }
      publishDate = validatedData.scheduledPublishAt;
    }

    // Prepare update data with safe date handling
    const updateData: any = {
      // Only change status to PUBLISHED if publishing immediately
      // For scheduled publishing, keep current READY_TO_PUBLISH status
      ...(validatedData.publishImmediately && { status: 'PUBLISHED' }),
      publishedAt: validatedData.publishImmediately ? publishDate : null,
      publishedBy: session.user.id,
      followUpNote: validatedData.followUpNote || null,
      updatedAt: new Date(),
      // Store scheduled publish date for future reference
      ...(validatedData.scheduledPublishAt && { scheduledPublishAt: publishDate }),
    };

    // Only set followUpDate if it's a valid date
    if (validatedData.followUpDate && validatedData.followUpDate instanceof Date && !isNaN(validatedData.followUpDate.getTime())) {
      updateData.followUpDate = validatedData.followUpDate;
    } else {
      updateData.followUpDate = null;
    }

    // Use transaction to ensure story and translation updates happen atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update story status and metadata
      const updatedStory = await tx.story.update({
        where: { id },
        data: updateData,
        include: {
          author: true,
          category: true,
          publisher: true,
          translationRequests: true,
        }
      });

      // Mark all approved translations as published if publishing immediately
      if (validatedData.publishImmediately) {
        await tx.translation.updateMany({
          where: {
            originalStoryId: id,
            status: 'APPROVED'
          },
          data: {
            status: TranslationStatus.PUBLISHED,
            publishedAt: new Date(),
          }
        });
      }

      return updatedStory;
    });

    // Log audit trails after successful transaction
    // If scheduled for later, store the scheduled date
    if (!validatedData.publishImmediately && validatedData.scheduledPublishAt) {
      // In a real implementation, you might use a job queue like Bull or a cron job
      // For now, we'll just log it for manual handling
      await logAudit({
        userId: session.user.id,
        action: 'SCHEDULE_PUBLISH',
        details: {
          entityType: 'STORY',
          entityId: id,
          scheduledFor: validatedData.scheduledPublishAt,
          followUpDate: validatedData.followUpDate || null,
          followUpNote: validatedData.followUpNote || null,
          checklist: {
            contentReviewed: validatedData.contentReviewed,
            translationsVerified: validatedData.translationsVerified,
            audioQualityChecked: validatedData.audioQualityChecked,
          },
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        targetId: id,
        targetType: 'STORY'
      });
    }

    // Log the publish activity
    await logAudit({
      userId: session.user.id,
      action: validatedData.publishImmediately ? 'PUBLISH_STORY' : 'SCHEDULE_STORY',
      details: {
        entityType: 'STORY',
        entityId: id,
        storyTitle: story.title,
        publishDate: publishDate,
        followUpDate: validatedData.followUpDate || null,
        translationsCount: story.translationRequests.length,
        checklist: {
          contentReviewed: validatedData.contentReviewed,
          translationsVerified: validatedData.translationsVerified,
          audioQualityChecked: validatedData.audioQualityChecked,
        },
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      targetId: id,
      targetType: 'STORY'
    });

    const updatedStory = result;

    return NextResponse.json({
      message: validatedData.publishImmediately
        ? 'Story published successfully'
        : 'Story scheduled for publishing',
      story: updatedStory,
      publishedAt: publishDate,
      followUpDate: validatedData.followUpDate || null,
      translationsPublished: validatedData.publishImmediately ? updatedStory.translationRequests.filter(t => t.status === 'APPROVED').length : 0,
    });

  } catch (error: unknown) {
    console.error('Error publishing story:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to publish story';
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}

// GET endpoint to check if story can be published
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

    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        translationRequests: true,
        category: true,
        audioClips: true,
      }
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const userRole = session.user.staffRole ?? null;
    const canPublish = canPublishStory(userRole);
    const isReadyToPublishStatus = story.status === 'READY_TO_PUBLISH';
    const canChangeStatus = canUpdateStoryStatus(userRole, story.status, 'PUBLISHED');
    const hasTranslations = story.translationRequests.length > 0;
    const allTranslationsApproved = story.translationRequests.every(t => t.status === 'APPROVED');
    const hasCategory = !!story.categoryId;

    const readyToPublish = canPublish && isReadyToPublishStatus && canChangeStatus && hasTranslations && allTranslationsApproved && hasCategory;

    const issues = [];
    if (!canPublish) issues.push('User does not have publish permissions');
    if (!isReadyToPublishStatus) issues.push(`Story must be in READY_TO_PUBLISH status (current: ${story.status}). Ensure all translations are approved first.`);
    if (!canChangeStatus) issues.push(`Cannot publish story with current permissions and status`);
    if (!hasTranslations) issues.push('Story must have translations before publishing');
    if (!allTranslationsApproved) issues.push('All translations must be approved before publishing');
    if (!hasCategory) issues.push('Story must have a category assigned');

    return NextResponse.json({
      canPublish: readyToPublish,
      issues,
      checks: {
        hasPermission: canPublish,
        hasCorrectStatus: isReadyToPublishStatus,
        canChangeStatus: canChangeStatus,
        hasTranslations,
        translationsApproved: allTranslationsApproved,
        hasCategory,
        currentStatus: story.status,
        translationsCount: story.translationRequests.length,
        approvedTranslations: story.translationRequests.filter(t => t.status === 'APPROVED').length,
      }
    });

  } catch (error: unknown) {
    console.error('Error checking publish status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check publish status';
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}