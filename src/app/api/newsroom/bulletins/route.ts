import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createBulletinSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  intro: z.string().min(1, 'Introduction is required'),
  outro: z.string().min(1, 'Outro is required'),
  language: z.enum(['ENGLISH', 'AFRIKAANS', 'XHOSA']),
  scheduleId: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  stories: z.array(z.object({
    storyId: z.string(),
    order: z.number(),
  })).optional(),
});

// GET /api/newsroom/bulletins - Get all bulletins
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission
    if (!session.user.staffRole || !['EDITOR', 'SUB_EDITOR', 'SUPERADMIN', 'ADMIN'].includes(session.user.staffRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const status = url.searchParams.get('status');
    const language = url.searchParams.get('language');
    const skip = (page - 1) * perPage;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (language) {
      where.language = language;
    }

    const [bulletins, total] = await Promise.all([
      prisma.bulletin.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: perPage,
      }),
      prisma.bulletin.count({ where }),
    ]);

    return NextResponse.json({
      bulletins,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching bulletins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulletins' },
      { status: 500 }
    );
  }
}

// POST /api/newsroom/bulletins - Create a new bulletin
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission
    if (!session.user.staffRole || !['EDITOR', 'SUB_EDITOR', 'SUPERADMIN', 'ADMIN'].includes(session.user.staffRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createBulletinSchema.parse(body);

    // Get the News Bulletins category
    let category = await prisma.category.findFirst({
      where: {
        slug: 'news-bulletins',
      },
    });

    // Create the category if it doesn't exist
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'News Bulletins',
          slug: 'news-bulletins',
          description: 'News bulletins for radio stations',
          level: 1,
          isParent: true,
          isEditable: false,
        },
      });
    }

    // Generate slug from title
    const baseSlug = validatedData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Ensure unique slug
    let slug = baseSlug;
    let counter = 0;
    while (await prisma.bulletin.findUnique({ where: { slug } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create the bulletin
    const bulletin = await prisma.bulletin.create({
      data: {
        title: validatedData.title,
        slug,
        intro: validatedData.intro,
        outro: validatedData.outro,
        language: validatedData.language,
        scheduleId: validatedData.scheduleId,
        scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined,
        authorId: session.user.id,
        categoryId: category.id,
        status: 'DRAFT',
      },
      include: {
        author: {
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
      },
    });

    // Add stories if provided
    if (validatedData.stories && validatedData.stories.length > 0) {
      await prisma.bulletinStory.createMany({
        data: validatedData.stories.map(story => ({
          bulletinId: bulletin.id,
          storyId: story.storyId,
          order: story.order,
        })),
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_BULLETIN',
        entityType: 'BULLETIN',
        entityId: bulletin.id,
        metadata: {
          title: bulletin.title,
          language: bulletin.language,
        },
      },
    });

    return NextResponse.json({ bulletin }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating bulletin:', error);
    return NextResponse.json(
      { error: 'Failed to create bulletin' },
      { status: 500 }
    );
  }
}