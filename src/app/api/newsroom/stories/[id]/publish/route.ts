import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { canPublishStory, canUpdateStoryStage } from '@/lib/permissions';

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
        audioClips: {
          select: {
            audioClip: true,
          },
        },
      }
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Verify story can be published - must be in TRANSLATED stage
    if (story.stage !== 'TRANSLATED') {
      return NextResponse.json({
        error: `Story must be in TRANSLATED stage. Current stage: ${story.stage}. Ensure all translations are approved first.`
      }, { status: 400 });
    }

    // Verify user has permission to publish
    if (!canUpdateStoryStage(userRole, story.stage, 'PUBLISHED')) {
      return NextResponse.json({
        error: `Insufficient permissions to publish story`
      }, { status: 403 });
    }

    // Check that ALL translations are ready (APPROVED or TRANSLATED stage)
    // Stories must be published together with all their translations
    const allTranslations = await prisma.story.findMany({
      where: {
        originalStoryId: id,
        isTranslation: true
      },
      select: {
        id: true,
        title: true,
        language: true,
        stage: true
      }
    });

    const notReadyTranslations = allTranslations.filter(
      t => !t.stage || !['APPROVED', 'TRANSLATED'].includes(t.stage)
    );

    if (notReadyTranslations.length > 0) {
      const notReadyList = notReadyTranslations
        .map(t => `${t.language} (${t.stage})`)
        .join(', ');
      return NextResponse.json({
        error: `All translations must be approved before publishing. The following translations are not ready: ${notReadyList}`
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
      // Only change stage to PUBLISHED if publishing immediately
      // For scheduled publishing, keep current TRANSLATED stage
      ...(validatedData.publishImmediately && { stage: 'PUBLISHED', status: 'PUBLISHED' }),
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
        }
      });

      // Mark all approved/translated translation stories as published if publishing immediately
      if (validatedData.publishImmediately) {
        await tx.story.updateMany({
          where: {
            originalStoryId: id,
            isTranslation: true,
            stage: {
              in: ['APPROVED', 'TRANSLATED']
            }
          },
          data: {
            stage: 'PUBLISHED',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            publishedBy: session.user.id,
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

    // Count translation stories
    const translationsCount = await prisma.story.count({
      where: {
        originalStoryId: id,
        isTranslation: true
      }
    });

    const publishedTranslationsCount = validatedData.publishImmediately
      ? await prisma.story.count({
          where: {
            originalStoryId: id,
            isTranslation: true,
            stage: 'PUBLISHED'
          }
        })
      : 0;

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
        translationsCount,
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
      translationsPublished: publishedTranslationsCount,
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

/**
 * GET /api/newsroom/stories/[id]/publish
 * Check if story can be published based on stage, permissions, and requirements
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

    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        category: true,
        audioClips: {
          select: {
            audioClip: true,
          },
        },
      }
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Get all translation stories with their stages
    const allTranslations = await prisma.story.findMany({
      where: {
        originalStoryId: id,
        isTranslation: true
      },
      select: {
        id: true,
        language: true,
        stage: true
      }
    });

    const translationsCount = allTranslations.length;
    const approvedTranslationsCount = allTranslations.filter(
      t => t.stage && ['APPROVED', 'TRANSLATED', 'PUBLISHED'].includes(t.stage)
    ).length;
    const notReadyTranslations = allTranslations.filter(
      t => !t.stage || !['APPROVED', 'TRANSLATED', 'PUBLISHED'].includes(t.stage)
    );
    const allTranslationsReady = notReadyTranslations.length === 0;

    const userRole = session.user.staffRole ?? null;
    const canPublish = canPublishStory(userRole);
    const isTranslatedStage = story.stage === 'TRANSLATED';
    const canChangeStage = canUpdateStoryStage(userRole, story.stage, 'PUBLISHED');
    const hasCategory = !!story.categoryId;

    // All translations must be ready for publishing
    const readyToPublish = canPublish && isTranslatedStage && canChangeStage && hasCategory && allTranslationsReady;

    const issues: string[] = [];
    if (!canPublish) issues.push('User does not have publish permissions');
    if (!isTranslatedStage) issues.push(`Story must be in TRANSLATED stage (current: ${story.stage}). Ensure all translations are approved first.`);
    if (!canChangeStage) issues.push(`Cannot publish story with current permissions and stage`);
    if (!hasCategory) issues.push('Story must have a category assigned');
    if (!allTranslationsReady) {
      const notReadyList = notReadyTranslations
        .map(t => `${t.language} (${t.stage})`)
        .join(', ');
      issues.push(`All translations must be approved before publishing. Not ready: ${notReadyList}`);
    }

    return NextResponse.json({
      canPublish: readyToPublish,
      issues,
      checks: {
        hasPermission: canPublish,
        hasCorrectStage: isTranslatedStage,
        canChangeStage: canChangeStage,
        hasCategory,
        allTranslationsReady,
        currentStage: story.stage,
        translationsCount,
        approvedTranslations: approvedTranslationsCount,
        notReadyTranslations: notReadyTranslations.map(t => ({ language: t.language, stage: t.stage })),
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