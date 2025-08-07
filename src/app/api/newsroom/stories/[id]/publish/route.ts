import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { canPublishStory, canUpdateStoryStatus } from '@/lib/permissions';
import { TranslationStatus } from '@prisma/client';

const publishSchema = z.object({
  followUpDate: z.string().transform(str => new Date(str)).optional(),
  followUpNote: z.string().optional(),
  scheduledPublishAt: z.string().transform(str => new Date(str)).optional(),
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
        translations: {
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

    // Verify story can be published
    if (!canUpdateStoryStatus(userRole, story.status, 'PUBLISHED')) {
      return NextResponse.json({ 
        error: `Cannot publish story with status: ${story.status}` 
      }, { status: 400 });
    }

    // Check if all required translations are approved
    const pendingTranslations = story.translations.filter(t => t.status !== 'APPROVED');
    if (pendingTranslations.length > 0) {
      return NextResponse.json({ 
        error: 'All translations must be approved before publishing',
        pendingTranslations: pendingTranslations.length
      }, { status: 400 });
    }

    // Determine publish date
    const publishDate = validatedData.publishImmediately 
      ? new Date() 
      : validatedData.scheduledPublishAt || new Date();

    // Update story status and metadata
    const updatedStory = await prisma.story.update({
      where: { id },
      data: {
        status: validatedData.publishImmediately ? 'PUBLISHED' : 'READY_TO_PUBLISH',
        publishedAt: validatedData.publishImmediately ? publishDate : null,
        publishedBy: session.user.id,
        followUpDate: validatedData.followUpDate || null,
        followUpNote: validatedData.followUpNote || null,
        updatedAt: new Date(),
      },
      include: {
        author: true,
        category: true,
        publisher: true,
        translations: true,
      }
    });

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
        translationsCount: story.translations.length,
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

    // Mark all approved translations as published
    if (validatedData.publishImmediately) {
      await prisma.translation.updateMany({
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

    return NextResponse.json({
      message: validatedData.publishImmediately 
        ? 'Story published successfully' 
        : 'Story scheduled for publishing',
      story: updatedStory,
      publishedAt: publishDate,
      followUpDate: validatedData.followUpDate || null,
      translationsPublished: validatedData.publishImmediately ? updatedStory.translations.length : 0,
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
        translations: true,
        category: true,
        audioClips: true,
      }
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const userRole = session.user.staffRole ?? null;
    const canPublish = canPublishStory(userRole);
    const canChangeStatus = canUpdateStoryStatus(userRole, story.status, 'PUBLISHED');
    const allTranslationsApproved = story.translations.every(t => t.status === 'APPROVED');
    const hasCategory = !!story.categoryId;

    const readyToPublish = canPublish && canChangeStatus && allTranslationsApproved && hasCategory;

    const issues = [];
    if (!canPublish) issues.push('User does not have publish permissions');
    if (!canChangeStatus) issues.push(`Cannot publish story with status: ${story.status}`);
    if (!allTranslationsApproved) issues.push('Some translations are not approved');
    if (!hasCategory) issues.push('Story must have a category assigned');

    return NextResponse.json({
      canPublish: readyToPublish,
      issues,
      checks: {
        hasPermission: canPublish,
        correctStatus: canChangeStatus,
        translationsApproved: allTranslationsApproved,
        hasCategory,
        currentStatus: story.status,
        translationsCount: story.translations.length,
        approvedTranslations: story.translations.filter(t => t.status === 'APPROVED').length,
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