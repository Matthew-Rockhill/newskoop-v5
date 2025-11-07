import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canPublishEpisode } from '@/lib/permissions';
import { z } from 'zod';

const publishSchema = z.object({
  scheduledPublishAt: z.string().datetime().optional(),
});

// POST /api/newsroom/shows/[id]/episodes/[episodeId]/publish - Publish or schedule an episode
const publishEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canPublishEpisode(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        audioClips: true,
      },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.showId !== id) {
      return NextResponse.json({ error: 'Episode does not belong to this show' }, { status: 400 });
    }

    // Check if episode has audio
    if (episode.audioClips.length === 0) {
      return NextResponse.json({ error: 'Episode must have at least one audio file to publish' }, { status: 400 });
    }

    const body = await req.json();
    const data = publishSchema.parse(body);

    const now = new Date();
    const scheduledDate = data.scheduledPublishAt ? new Date(data.scheduledPublishAt) : null;

    // If scheduled date is in the past, publish immediately
    const shouldPublishNow = !scheduledDate || scheduledDate <= now;

    // Update episode
    const updatedEpisode = await prisma.episode.update({
      where: { id: episodeId },
      data: {
        status: shouldPublishNow ? 'PUBLISHED' : 'DRAFT',
        publishedAt: shouldPublishNow ? now : null,
        scheduledPublishAt: shouldPublishNow ? null : scheduledDate,
        publishedBy: shouldPublishNow ? user.id : null,
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
        show: true,
      },
    });

    return NextResponse.json({
      episode: updatedEpisode,
      message: shouldPublishNow ? 'Episode published successfully' : 'Episode scheduled for publication',
    });
  },
  [withErrorHandling, withAuth, withAudit('episode.publish')]
);

// DELETE /api/newsroom/shows/[id]/episodes/[episodeId]/publish - Unpublish an episode
const unpublishEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canPublishEpisode(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.showId !== id) {
      return NextResponse.json({ error: 'Episode does not belong to this show' }, { status: 400 });
    }

    // Update episode to draft
    const updatedEpisode = await prisma.episode.update({
      where: { id: episodeId },
      data: {
        status: 'DRAFT',
        publishedAt: null,
        scheduledPublishAt: null,
        publishedBy: null,
      },
      include: {
        audioClips: true,
        show: true,
      },
    });

    return NextResponse.json({
      episode: updatedEpisode,
      message: 'Episode unpublished successfully',
    });
  },
  [withErrorHandling, withAuth, withAudit('episode.unpublish')]
);

export const POST = publishEpisode;
export const DELETE = unpublishEpisode;
