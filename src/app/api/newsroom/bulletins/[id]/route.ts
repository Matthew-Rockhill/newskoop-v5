import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateBulletinSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  intro: z.string().min(1, 'Introduction is required').optional(),
  outro: z.string().min(1, 'Outro is required').optional(),
  language: z.enum(['ENGLISH', 'AFRIKAANS', 'XHOSA']).optional(),
  scheduleId: z.string().nullable().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).optional(),
  reviewerId: z.string().nullable().optional(),
});

// GET /api/newsroom/bulletins/[id] - Get a single bulletin
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bulletin = await prisma.bulletin.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        publisher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        schedule: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
                audioClips: {
                  select: {
                    id: true,
                    filename: true,
                    url: true,
                    duration: true,
                    mimeType: true,
                  },
                  take: 1, // Get only the first audio clip
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

    if (!bulletin) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    // Transform bulletin stories to include audioUrl at story level
    const transformedBulletin = {
      ...bulletin,
      bulletinStories: bulletin.bulletinStories.map((bs: any) => ({
        ...bs,
        story: {
          ...bs.story,
          audioUrl: bs.story.audioClips?.[0]?.url || null,
        },
      })),
    };

    return NextResponse.json({ bulletin: transformedBulletin });
  } catch (error) {
    console.error('Error fetching bulletin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulletin' },
      { status: 500 }
    );
  }
}

// PATCH /api/newsroom/bulletins/[id] - Update a bulletin
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
    const validatedData = updateBulletinSchema.parse(body);

    // Check if bulletin exists and user has permission to edit
    const existing = await prisma.bulletin.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        reviewerId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    // Check permissions based on status and role
    const userRole = session.user.staffRole;
    const isAuthor = existing.authorId === session.user.id;
    const isReviewer = existing.reviewerId === session.user.id;
    const isEditor = userRole && ['EDITOR', 'SUPERADMIN', 'ADMIN'].includes(userRole);
    const isSubEditor = userRole === 'SUB_EDITOR';

    // Permission logic
    if (existing.status === 'DRAFT' && !isAuthor && !isEditor) {
      return NextResponse.json({ error: 'Only the author can edit draft bulletins' }, { status: 403 });
    }

    if (existing.status === 'IN_REVIEW' && !isReviewer && !isEditor) {
      return NextResponse.json({ error: 'Only the reviewer can edit bulletins in review' }, { status: 403 });
    }

    if (['APPROVED', 'PUBLISHED'].includes(existing.status) && !isEditor) {
      return NextResponse.json({ error: 'Only editors can edit approved or published bulletins' }, { status: 403 });
    }

    // Update slug if title changes
    const updateData: any = { ...validatedData };
    if (validatedData.title) {
      const baseSlug = validatedData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      let slug = baseSlug;
      let counter = 0;
      while (await prisma.bulletin.findFirst({ where: { slug, id: { not: id } } })) {
        counter++;
        slug = `${baseSlug}-${counter}`;
      }
      updateData.slug = slug;
    }

    // Handle scheduled date
    if (validatedData.scheduledFor !== undefined) {
      updateData.scheduledFor = validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : null;
    }

    const bulletin = await prisma.bulletin.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        schedule: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            bulletinStories: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_BULLETIN',
        entityType: 'BULLETIN',
        entityId: bulletin.id,
        metadata: {
          changes: validatedData,
        },
      },
    });

    return NextResponse.json({ bulletin });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating bulletin:', error);
    return NextResponse.json(
      { error: 'Failed to update bulletin' },
      { status: 500 }
    );
  }
}

// DELETE /api/newsroom/bulletins/[id] - Delete a bulletin
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if bulletin exists
    const bulletin = await prisma.bulletin.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        title: true,
      },
    });

    if (!bulletin) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    // Only allow deletion of draft bulletins by author or editor
    const userRole = session.user.staffRole;
    const isAuthor = bulletin.authorId === session.user.id;
    const isEditor = userRole && ['EDITOR', 'SUPERADMIN', 'ADMIN'].includes(userRole);

    if (bulletin.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only draft bulletins can be deleted' }, { status: 403 });
    }

    if (!isAuthor && !isEditor) {
      return NextResponse.json({ error: 'Only the author or an editor can delete this bulletin' }, { status: 403 });
    }

    // Delete the bulletin (cascade will handle related records)
    await prisma.bulletin.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_BULLETIN',
        entityType: 'BULLETIN',
        entityId: id,
        metadata: {
          title: bulletin.title,
          status: bulletin.status,
        },
      },
    });

    return NextResponse.json({ message: 'Bulletin deleted successfully' });
  } catch (error) {
    console.error('Error deleting bulletin:', error);
    return NextResponse.json(
      { error: 'Failed to delete bulletin' },
      { status: 500 }
    );
  }
}