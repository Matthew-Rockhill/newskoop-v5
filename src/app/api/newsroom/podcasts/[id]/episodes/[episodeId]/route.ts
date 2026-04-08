import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canManagePodcasts, canDeletePodcast } from '@/lib/permissions';
import { z } from 'zod';
import { publishPodcastEpisodeEvent, createEvent } from '@/lib/ably';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenPodcastEpisodeAudio(episode: any) {
  if (!episode) return episode;
  return {
    ...episode,
    audioClips: episode.audioClips?.map((eac: any) => eac.audioClip) || [],
  };
}

const episodeUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  coverImage: z.string().nullable().optional(),
});

// GET /api/newsroom/podcasts/[id]/episodes/[episodeId]
const getEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const _user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    const episode = await prisma.podcastEpisode.findUnique({
      where: { id: episodeId },
      include: {
        podcast: {
          include: {
            category: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        audioClips: { include: { audioClip: true } },
        publisher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.podcastId !== id) {
      return NextResponse.json({ error: 'Episode does not belong to this podcast' }, { status: 400 });
    }

    return NextResponse.json({ episode: flattenPodcastEpisodeAudio(episode) });
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/podcasts/[id]/episodes/[episodeId]
const updateEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canManagePodcasts(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const episode = await prisma.podcastEpisode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.podcastId !== id) {
      return NextResponse.json({ error: 'Episode does not belong to this podcast' }, { status: 400 });
    }

    const body = await req.json();
    const data = episodeUpdateSchema.parse(body);

    if (data.slug && data.slug !== episode.slug) {
      const existingEpisode = await prisma.podcastEpisode.findUnique({
        where: { slug: data.slug },
      });
      if (existingEpisode) {
        return NextResponse.json({ error: 'An episode with this slug already exists' }, { status: 400 });
      }
    }

    const updatedEpisode = await prisma.podcastEpisode.update({
      where: { id: episodeId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      },
      include: {
        audioClips: { include: { audioClip: true } },
        publisher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    publishPodcastEpisodeEvent(
      createEvent('podcast_episode:updated', 'podcast_episode', episodeId, user.id, undefined, {
        podcastId: id,
        updatedFields: Object.keys(data),
      })
    ).catch(() => {});

    return NextResponse.json({ episode: flattenPodcastEpisodeAudio(updatedEpisode) });
  },
  [withErrorHandling, withAuth, withAudit('podcast_episode.update')]
);

// DELETE /api/newsroom/podcasts/[id]/episodes/[episodeId]
const deleteEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canDeletePodcast(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const episode = await prisma.podcastEpisode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.podcastId !== id) {
      return NextResponse.json({ error: 'Episode does not belong to this podcast' }, { status: 400 });
    }

    await prisma.podcastEpisode.delete({
      where: { id: episodeId },
    });

    return NextResponse.json({ message: 'Episode deleted successfully' });
  },
  [withErrorHandling, withAuth, withAudit('podcast_episode.delete')]
);

export const GET = getEpisode;
export const PATCH = updateEpisode;
export const DELETE = deleteEpisode;
