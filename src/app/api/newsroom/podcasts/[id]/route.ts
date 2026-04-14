import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { hasPodcastPermission, canEditPodcast, canDeletePodcast } from '@/lib/permissions';
import { z } from 'zod';
import { publishPodcastEvent, createEvent } from '@/lib/ably';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenPodcastEpisodeAudio(episode: any) {
  if (!episode) return episode;
  return {
    ...episode,
    audioClips: episode.audioClips?.map((eac: any) => eac.audioClip) || [],
  };
}

const podcastUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  classificationIds: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  coverImage: z.string().nullable().optional(),
});

// GET /api/newsroom/podcasts/[id]
const getPodcast = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null; isContentProducer: boolean } }).user;

    if (!hasPodcastPermission(user.staffRole as any, 'read', user.isContentProducer)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const podcast = await prisma.podcast.findUnique({
      where: { id },
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
        episodes: {
          include: {
            audioClips: { include: { audioClip: true } },
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
        },
      },
    });

    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    return NextResponse.json({
      podcast: {
        ...podcast,
        episodes: podcast.episodes.map(flattenPodcastEpisodeAudio),
      },
    });
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/podcasts/[id]
const updatePodcast = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null; isContentProducer: boolean } }).user;

    const podcast = await prisma.podcast.findUnique({
      where: { id },
    });

    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    if (!canEditPodcast(user.staffRole as any, podcast.createdById, user.id, user.isContentProducer)) {
      return NextResponse.json({ error: 'Insufficient permissions to edit this podcast' }, { status: 403 });
    }

    const body = await req.json();
    const data = podcastUpdateSchema.parse(body);

    if (data.slug && data.slug !== podcast.slug) {
      const existingPodcast = await prisma.podcast.findUnique({
        where: { slug: data.slug },
      });
      if (existingPodcast) {
        return NextResponse.json({ error: 'A podcast with this slug already exists' }, { status: 400 });
      }
    }

    const updatedPodcast = await prisma.podcast.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
        ...(data.classificationIds !== undefined && {
          classifications: {
            deleteMany: {},
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
      createEvent('podcast:updated', 'podcast', id, user.id, undefined, {
        updatedFields: Object.keys(data),
      })
    ).catch(() => {});

    return NextResponse.json({ podcast: updatedPodcast });
  },
  [withErrorHandling, withAuth, withAudit('podcast.update')]
);

// DELETE /api/newsroom/podcasts/[id]
const deletePodcast = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null; isContentProducer: boolean } }).user;

    if (!canDeletePodcast(user.staffRole as any, user.isContentProducer)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const podcast = await prisma.podcast.findUnique({
      where: { id },
    });

    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    await prisma.podcast.update({
      where: { id },
      data: { isActive: false },
    });

    publishPodcastEvent(
      createEvent('podcast:deleted', 'podcast', id, user.id)
    ).catch(() => {});

    return NextResponse.json({ message: 'Podcast deleted successfully' });
  },
  [withErrorHandling, withAuth, withAudit('podcast.delete')]
);

export const GET = getPodcast;
export const PATCH = updatePodcast;
export const DELETE = deletePodcast;
