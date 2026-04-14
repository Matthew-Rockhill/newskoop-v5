import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canPublishPodcastEpisode } from '@/lib/permissions';
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

const publishSchema = z.object({
  scheduledPublishAt: z.string().datetime().optional(),
});

// POST /api/newsroom/podcasts/[id]/episodes/[episodeId]/publish
const publishEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null; isContentProducer: boolean } }).user;

    if (!canPublishPodcastEpisode(user.staffRole as any, user.isContentProducer)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const episode = await prisma.podcastEpisode.findUnique({
      where: { id: episodeId },
      include: {
        audioClips: { include: { audioClip: true } },
      },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.podcastId !== id) {
      return NextResponse.json({ error: 'Episode does not belong to this podcast' }, { status: 400 });
    }

    if (episode.audioClips.length === 0) {
      return NextResponse.json({ error: 'Episode must have at least one audio file to publish' }, { status: 400 });
    }

    const body = await req.json();
    const data = publishSchema.parse(body);

    const now = new Date();
    const scheduledDate = data.scheduledPublishAt ? new Date(data.scheduledPublishAt) : null;
    const shouldPublishNow = !scheduledDate || scheduledDate <= now;

    const updatedEpisode = await prisma.podcastEpisode.update({
      where: { id: episodeId },
      data: {
        status: shouldPublishNow ? 'PUBLISHED' : 'DRAFT',
        publishedAt: shouldPublishNow ? now : null,
        scheduledPublishAt: shouldPublishNow ? null : scheduledDate,
        publishedBy: shouldPublishNow ? user.id : null,
      },
      include: {
        audioClips: { include: { audioClip: true } },
        publisher: {
          select: { id: true, firstName: true, lastName: true },
        },
        podcast: true,
      },
    });

    if (shouldPublishNow) {
      publishPodcastEpisodeEvent(
        createEvent('podcast_episode:published', 'podcast_episode', episodeId, user.id, undefined, {
          podcastId: id,
          publishedAt: now.toISOString(),
        })
      ).catch(() => {});
    }

    return NextResponse.json({
      episode: flattenPodcastEpisodeAudio(updatedEpisode),
      message: shouldPublishNow ? 'Episode published successfully' : 'Episode scheduled for publication',
    });
  },
  [withErrorHandling, withAuth, withAudit('podcast_episode.publish')]
);

// DELETE /api/newsroom/podcasts/[id]/episodes/[episodeId]/publish
const unpublishEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null; isContentProducer: boolean } }).user;

    if (!canPublishPodcastEpisode(user.staffRole as any, user.isContentProducer)) {
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

    const updatedEpisode = await prisma.podcastEpisode.update({
      where: { id: episodeId },
      data: {
        status: 'DRAFT',
        publishedAt: null,
        scheduledPublishAt: null,
        publishedBy: null,
      },
      include: {
        audioClips: { include: { audioClip: true } },
        podcast: true,
      },
    });

    return NextResponse.json({
      episode: flattenPodcastEpisodeAudio(updatedEpisode),
      message: 'Episode unpublished successfully',
    });
  },
  [withErrorHandling, withAuth, withAudit('podcast_episode.unpublish')]
);

export const POST = publishEpisode;
export const DELETE = unpublishEpisode;
