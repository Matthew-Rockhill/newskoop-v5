import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canManageShows } from '@/lib/permissions';
import { z } from 'zod';
import { generateSlug, generateUniqueEpisodeSlug } from '@/lib/slug-utils';
import { publishEpisodeEvent, createEvent } from '@/lib/ably';

const episodeCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  content: z.string().optional(), // Rich text show notes
  coverImage: z.string().optional(),
});

// GET /api/newsroom/shows/[id]/episodes - List episodes for a show
const getEpisodes = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const _user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    // Verify show exists
    const show = await prisma.show.findUnique({
      where: { id: id },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Get episodes
    const episodes = await prisma.episode.findMany({
      where: {
        showId: id,
      },
      include: {
        audioClips: true,
        publisher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        episodeNumber: 'desc',
      },
    });

    return NextResponse.json({ episodes });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/shows/[id]/episodes - Create a new episode
const createEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canManageShows(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify show exists
    const show = await prisma.show.findUnique({
      where: { id: id },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    const body = await req.json();
    const data = episodeCreateSchema.parse(body);

    // Generate unique slug with optimized single-query approach
    const baseSlug = generateSlug(data.title);
    const uniqueSlug = await generateUniqueEpisodeSlug(baseSlug);

    // Get the next episode number
    const lastEpisode = await prisma.episode.findFirst({
      where: { showId: id },
      orderBy: { episodeNumber: 'desc' },
    });

    const episodeNumber = (lastEpisode?.episodeNumber || 0) + 1;

    // Create episode
    const episode = await prisma.episode.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        description: data.description,
        content: data.content,
        coverImage: data.coverImage,
        episodeNumber,
        showId: id,
      },
      include: {
        audioClips: true,
        publisher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Publish real-time event (non-blocking)
    publishEpisodeEvent(
      createEvent('episode:created', 'episode', episode.id, user.id, undefined, {
        showId: id,
        title: episode.title,
        episodeNumber: episode.episodeNumber,
      })
    ).catch(() => {});

    return NextResponse.json({ episode }, { status: 201 });
  },
  [withErrorHandling, withAuth, withAudit('episode.create')]
);

export const GET = getEpisodes;
export const POST = createEpisode;
