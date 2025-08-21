import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateStoriesSchema = z.object({
  stories: z.array(z.object({
    storyId: z.string(),
    order: z.number(),
  })),
});

// PATCH /api/newsroom/bulletins/[id]/stories - Update bulletin stories and their order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateStoriesSchema.parse(body);

    // Check if bulletin exists and user has permission
    const bulletin = await prisma.bulletin.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        reviewerId: true,
      },
    });

    if (!bulletin) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    // Check permissions
    const userRole = session.user.staffRole;
    const isAuthor = bulletin.authorId === session.user.id;
    const isReviewer = bulletin.reviewerId === session.user.id;
    const isEditor = userRole && ['EDITOR', 'SUPERADMIN', 'ADMIN'].includes(userRole);

    // Only allow editing stories for bulletins in DRAFT or IN_REVIEW status
    if (!['DRAFT', 'IN_REVIEW', 'NEEDS_REVISION'].includes(bulletin.status)) {
      return NextResponse.json({ error: 'Cannot modify stories for bulletins in this status' }, { status: 403 });
    }

    if (bulletin.status === 'DRAFT' && !isAuthor && !isEditor) {
      return NextResponse.json({ error: 'Only the author can edit draft bulletin stories' }, { status: 403 });
    }

    if (bulletin.status === 'IN_REVIEW' && !isReviewer && !isEditor) {
      return NextResponse.json({ error: 'Only the reviewer can edit bulletin stories in review' }, { status: 403 });
    }

    // Validate that all stories exist and are published
    const storyIds = validatedData.stories.map(s => s.storyId);
    const stories = await prisma.story.findMany({
      where: {
        id: { in: storyIds },
        status: 'PUBLISHED',
      },
      select: { id: true },
    });

    if (stories.length !== storyIds.length) {
      return NextResponse.json({ error: 'Some stories are not published or do not exist' }, { status: 400 });
    }

    // Start a transaction to update stories
    await prisma.$transaction(async (tx) => {
      // Delete existing bulletin stories
      await tx.bulletinStory.deleteMany({
        where: { bulletinId: id },
      });

      // Create new bulletin stories with updated order
      if (validatedData.stories.length > 0) {
        await tx.bulletinStory.createMany({
          data: validatedData.stories.map(story => ({
            bulletinId: id,
            storyId: story.storyId,
            order: story.order,
          })),
        });
      }
    });

    // Fetch updated bulletin with stories
    const updatedBulletin = await prisma.bulletin.findUnique({
      where: { id },
      include: {
        bulletinStories: {
          include: {
            story: {
              include: {
                author: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
                tags: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_BULLETIN_STORIES',
        entityType: 'BULLETIN',
        entityId: id,
        metadata: {
          storyCount: validatedData.stories.length,
        },
      },
    });

    return NextResponse.json({ bulletin: updatedBulletin });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating bulletin stories:', error);
    return NextResponse.json(
      { error: 'Failed to update bulletin stories' },
      { status: 500 }
    );
  }
}

// POST /api/newsroom/bulletins/[id]/stories - Add a single story to bulletin
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { storyId } = body;

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    // Check if bulletin exists and user has permission
    const bulletin = await prisma.bulletin.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
      },
    });

    if (!bulletin) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    // Check permissions
    const isAuthor = bulletin.authorId === session.user.id;
    const isEditor = session.user.staffRole && ['EDITOR', 'SUPERADMIN', 'ADMIN'].includes(session.user.staffRole);

    if (!['DRAFT', 'NEEDS_REVISION'].includes(bulletin.status)) {
      return NextResponse.json({ error: 'Can only add stories to draft bulletins' }, { status: 403 });
    }

    if (!isAuthor && !isEditor) {
      return NextResponse.json({ error: 'Only the author can add stories to this bulletin' }, { status: 403 });
    }

    // Check if story exists and is published
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, status: true },
    });

    if (!story || story.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Story not found or not published' }, { status: 400 });
    }

    // Check if story is already in bulletin
    const existing = await prisma.bulletinStory.findUnique({
      where: {
        bulletinId_storyId: {
          bulletinId: id,
          storyId: storyId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Story already in bulletin' }, { status: 400 });
    }

    // Get the highest order number
    const maxOrder = await prisma.bulletinStory.findFirst({
      where: { bulletinId: id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    // Add the story
    const bulletinStory = await prisma.bulletinStory.create({
      data: {
        bulletinId: id,
        storyId: storyId,
        order: (maxOrder?.order || 0) + 1,
      },
      include: {
        story: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ bulletinStory });
  } catch (error) {
    console.error('Error adding story to bulletin:', error);
    return NextResponse.json(
      { error: 'Failed to add story to bulletin' },
      { status: 500 }
    );
  }
}