import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { hasShowPermission, canManageShows } from '@/lib/permissions';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { generateSlug, generateUniqueShowSlug } from '@/lib/slug-utils';
import { publishShowEvent, createEvent } from '@/lib/ably';

// Show search schema - validation only, defaults handled in code
const showSearchSchema = z.object({
  query: z.string().optional(),
  isPublished: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  parentId: z.string().optional(),
  topLevelOnly: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

// Show create/update schema - validation only, defaults handled in code
const showSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  isPublished: z.boolean(),
  coverImage: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

// GET /api/newsroom/shows - List shows with filtering and pagination
const getShows = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasShowPermission(user.staffRole as any, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams);

    const validated = showSearchSchema.parse({
      ...searchParams,
      page: searchParams.page ? Number(searchParams.page) : undefined,
      perPage: searchParams.perPage ? Number(searchParams.perPage) : undefined,
      isPublished: searchParams.isPublished === 'true' ? true : searchParams.isPublished === 'false' ? false : undefined,
      topLevelOnly: searchParams.topLevelOnly === 'true' ? true : undefined,
      tagIds: searchParams.tagIds ? searchParams.tagIds.split(',') : undefined,
    });

    // Apply defaults using ?? operator
    const query = validated.query;
    const isPublished = validated.isPublished;
    const tagIds = validated.tagIds;
    const parentId = validated.parentId;
    const topLevelOnly = validated.topLevelOnly;
    const page = validated.page ?? 1;
    const perPage = validated.perPage ?? 10;

    // Build where clause
    const where: Prisma.ShowWhereInput = {
      isActive: true,
      ...(isPublished !== undefined && { isPublished }),
      ...(topLevelOnly && { parentId: null }),
      ...(parentId !== undefined && { parentId }),
      ...(query && {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: {
            some: {
              tag: { name: { contains: query, mode: 'insensitive' } }
            }
          }},
        ],
      }),
      ...(tagIds && tagIds.length > 0 && {
        tags: {
          some: {
            tagId: { in: tagIds }
          }
        }
      }),
    };

    // Get total count
    const total = await prisma.show.count({ where });

    // Get paginated shows
    const shows = await prisma.show.findMany({
      where,
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parent: {
          select: { id: true, title: true, slug: true },
        },
        subShows: {
          where: { isActive: true },
          include: {
            _count: { select: { episodes: true } },
            createdBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { title: 'asc' },
        },
        _count: {
          select: {
            episodes: true,
            subShows: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({
      shows,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/shows - Create a new show
const createShow = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canManageShows(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const data = showSchema.parse(body);

    // Validate parentId if provided
    if (data.parentId) {
      const parentShow = await prisma.show.findUnique({
        where: { id: data.parentId },
      });
      if (!parentShow) {
        return NextResponse.json({ error: 'Parent show not found' }, { status: 400 });
      }
      if (parentShow.parentId) {
        return NextResponse.json({ error: 'Cannot nest sub-shows more than 1 level deep' }, { status: 400 });
      }
    }

    // Generate unique slug with optimized single-query approach
    const baseSlug = generateSlug(data.title);
    const uniqueSlug = await generateUniqueShowSlug(baseSlug);

    // Create show
    const show = await prisma.show.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        description: data.description,
        coverImage: data.coverImage,
        isPublished: data.isPublished,
        createdById: user.id,
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.tagIds && data.tagIds.length > 0 && {
          tags: {
            create: data.tagIds.map(tagId => ({
              tag: { connect: { id: tagId } },
            })),
          },
        }),
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Publish real-time event (non-blocking)
    publishShowEvent(
      createEvent('show:created', 'show', show.id, user.id, undefined, {
        title: show.title,
      })
    ).catch(() => {});

    return NextResponse.json({ show }, { status: 201 });
  },
  [withErrorHandling, withAuth, withAudit('show.create')]
);

export const GET = getShows;
export const POST = createShow;
