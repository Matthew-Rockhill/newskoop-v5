import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canManagePodcasts } from '@/lib/permissions';
import { z } from 'zod';
import { generateSlug, generateUniquePodcastEpisodeSlug } from '@/lib/slug-utils';
import { publishPodcastEpisodeEvent, createEvent } from '@/lib/ably';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenPodcastEpisodeAudio(episode: any) {
  if (!episode) return episode;
  return {
    ...episode,
    audioClips: episode.audioClips?.map((eac: any) => eac.audioClip) || [],
  };
}

const episodeCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  content: z.string().optional(),
  coverImage: z.string().optional(),
});

// GET /api/newsroom/podcasts/[id]/episodes
const getEpisodes = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const _user = (req as NextRequest & { user: { id: string; staffRole: string | null; isContentProducer: boolean } }).user;

    const podcast = await prisma.podcast.findUnique({ where: { id } });

    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    const episodes = await prisma.podcastEpisode.findMany({
      where: { podcastId: id },
      include: {
        audioClips: { include: { audioClip: true } },
        publisher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { episodeNumber: 'desc' },
    });

    return NextResponse.json({ episodes: episodes.map(flattenPodcastEpisodeAudio) });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/podcasts/[id]/episodes
const createEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null; isContentProducer: boolean } }).user;

    if (!canManagePodcasts(user.staffRole as any, user.isContentProducer)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const podcast = await prisma.podcast.findUnique({ where: { id } });

    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    const body = await req.json();
    const data = episodeCreateSchema.parse(body);

    const baseSlug = generateSlug(data.title);
    const uniqueSlug = await generateUniquePodcastEpisodeSlug(baseSlug);

    const lastEpisode = await prisma.podcastEpisode.findFirst({
      where: { podcastId: id },
      orderBy: { episodeNumber: 'desc' },
    });

    const episodeNumber = (lastEpisode?.episodeNumber || 0) + 1;

    const episode = await prisma.podcastEpisode.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        description: data.description,
        content: data.content,
        coverImage: data.coverImage,
        episodeNumber,
        podcastId: id,
        createdById: user.id,
      },
      include: {
        audioClips: { include: { audioClip: true } },
        publisher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    publishPodcastEpisodeEvent(
      createEvent('podcast_episode:created', 'podcast_episode', episode.id, user.id, undefined, {
        podcastId: id,
        title: episode.title,
        episodeNumber: episode.episodeNumber,
      })
    ).catch(() => {});

    return NextResponse.json({ episode: flattenPodcastEpisodeAudio(episode) }, { status: 201 });
  },
  [withErrorHandling, withAuth, withAudit('podcast_episode.create')]
);

export const GET = getEpisodes;
export const POST = createEpisode;
