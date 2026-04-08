import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { hasPodcastPermission, canManagePodcasts } from '@/lib/permissions';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { generateSlug, generateUniquePodcastSlug } from '@/lib/slug-utils';
import { publishPodcastEvent, createEvent } from '@/lib/ably';

const podcastSearchSchema = z.object({
  query: z.string().optional(),
  isPublished: z.boolean().optional(),
  classificationIds: z.array(z.string()).optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

const podcastSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  classificationIds: z.array(z.string()).optional(),
  isPublished: z.boolean(),
  coverImage: z.string().optional(),
});

// GET /api/newsroom/podcasts - List podcasts with filtering and pagination
const getPodcasts = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasPodcastPermission(user.staffRole as any, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams);

    const validated = podcastSearchSchema.parse({
      ...searchParams,
      page: searchParams.page ? Number(searchParams.page) : undefined,
      perPage: searchParams.perPage ? Number(searchParams.perPage) : undefined,
      isPublished: searchParams.isPublished === 'true' ? true : searchParams.isPublished === 'false' ? false : undefined,
      classificationIds: searchParams.classificationIds ? searchParams.classificationIds.split(',') : undefined,
    });

    const query = validated.query;
    const isPublished = validated.isPublished;
    const classificationIds = validated.classificationIds;
    const page = validated.page ?? 1;
    const perPage = validated.perPage ?? 10;

    const where: Prisma.PodcastWhereInput = {
      isActive: true,
      ...(isPublished !== undefined && { isPublished }),
      ...(query && {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { classifications: {
            some: {
              classification: { name: { contains: query, mode: 'insensitive' } }
            }
          }},
        ],
      }),
      ...(classificationIds && classificationIds.length > 0 && {
        classifications: {
          some: {
            classificationId: { in: classificationIds }
          }
        }
      }),
    };

    const total = await prisma.podcast.count({ where });

    const podcasts = await prisma.podcast.findMany({
      where,
      include: {
        category: true,
        classifications: {
          include: {
            classification: true,
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
        _count: {
          select: {
            episodes: true,
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
      podcasts,
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

// POST /api/newsroom/podcasts - Create a new podcast
const createPodcast = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canManagePodcasts(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const data = podcastSchema.parse(body);

    const baseSlug = generateSlug(data.title);
    const uniqueSlug = await generateUniquePodcastSlug(baseSlug);

    const podcast = await prisma.podcast.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        description: data.description,
        coverImage: data.coverImage,
        isPublished: data.isPublished,
        createdById: user.id,
        ...(data.classificationIds && data.classificationIds.length > 0 && {
          classifications: {
            create: data.classificationIds.map(classificationId => ({
              classification: { connect: { id: classificationId } },
            })),
          },
        }),
      },
      include: {
        category: true,
        classifications: {
          include: {
            classification: true,
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

    publishPodcastEvent(
      createEvent('podcast:created', 'podcast', podcast.id, user.id, undefined, {
        title: podcast.title,
      })
    ).catch(() => {});

    return NextResponse.json({ podcast }, { status: 201 });
  },
  [withErrorHandling, withAuth, withAudit('podcast.create')]
);

export const GET = getPodcasts;
export const POST = createPodcast;
