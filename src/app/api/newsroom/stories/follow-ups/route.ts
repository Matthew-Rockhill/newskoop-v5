import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.staffRole ?? null;
    
    // Only editors and above can view follow-ups
    if (!userRole || !['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    // Build where clause
    const where = {
      followUpDate: {
        not: null,
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {})
      },
      ...(includeCompleted ? {} : { followUpCompleted: false })
    };

    // Fetch stories with follow-up dates, ordered by follow-up date
    const followUpStories = await prisma.story.findMany({
      where,
      orderBy: {
        followUpDate: 'asc'
      },
      include: {
        author: true,
        category: true,
        translations: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    // Format the response with useful information
    const formattedStories = followUpStories.map(story => {
      const daysUntilFollowUp = story.followUpDate 
        ? Math.ceil((story.followUpDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: story.id,
        title: story.title,
        status: story.status,
        followUpDate: story.followUpDate,
        followUpNote: story.followUpNote,
        followUpCompleted: story.followUpCompleted,
        daysUntilFollowUp,
        isOverdue: daysUntilFollowUp !== null && daysUntilFollowUp < 0,
        isDueToday: daysUntilFollowUp === 0,
        isDueSoon: daysUntilFollowUp !== null && daysUntilFollowUp > 0 && daysUntilFollowUp <= 7,
        publishedAt: story.publishedAt,
        author: story.author,
        category: story.category,
        translationsCount: story.translations.length,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt
      };
    });

    // Group stories by urgency
    const grouped = {
      overdue: formattedStories.filter(s => s.isOverdue),
      dueToday: formattedStories.filter(s => s.isDueToday),
      dueSoon: formattedStories.filter(s => s.isDueSoon),
      upcoming: formattedStories.filter(s => !s.isOverdue && !s.isDueToday && !s.isDueSoon)
    };

    return NextResponse.json({
      stories: formattedStories,
      grouped,
      total: formattedStories.length,
      counts: {
        overdue: grouped.overdue.length,
        dueToday: grouped.dueToday.length,
        dueSoon: grouped.dueSoon.length,
        upcoming: grouped.upcoming.length
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching follow-up stories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch follow-up stories';
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}

// Mark a follow-up as completed
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.staffRole ?? null;
    
    // Only editors and above can mark follow-ups as completed
    if (!userRole || !['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { storyId, completed = true, note } = body;

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    // Update the story's follow-up status
    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: {
        followUpCompleted: completed,
        followUpCompletedAt: completed ? new Date() : null,
        followUpCompletedBy: completed ? session.user.id : null,
        followUpNote: note || undefined
      },
      include: {
        author: true,
        category: true
      }
    });

    return NextResponse.json({
      message: completed ? 'Follow-up marked as completed' : 'Follow-up marked as incomplete',
      story: updatedStory
    });

  } catch (error: unknown) {
    console.error('Error updating follow-up status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update follow-up status';
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}