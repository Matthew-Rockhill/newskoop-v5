import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canManageShows, canDeleteShow } from '@/lib/permissions';
import { z } from 'zod';
import { publishEpisodeEvent, createEvent } from '@/lib/ably';

const episodeUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  coverImage: z.string().nullable().optional(),
});

// GET /api/newsroom/shows/[id]/episodes/[episodeId] - Get a single episode
const getEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        show: {
          include: {
            category: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
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

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.showId !== id) {
      return NextResponse.json({ error: 'Episode does not belong to this show' }, { status: 400 });
    }

    return NextResponse.json({ episode });
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/shows/[id]/episodes/[episodeId] - Update an episode
const updateEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canManageShows(user.staffRole as any)) {
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

    const body = await req.json();
    const data = episodeUpdateSchema.parse(body);

    // If slug is being updated, check uniqueness
    if (data.slug && data.slug !== episode.slug) {
      const existingEpisode = await prisma.episode.findUnique({
        where: { slug: data.slug },
      });

      if (existingEpisode) {
        return NextResponse.json({ error: 'An episode with this slug already exists' }, { status: 400 });
      }
    }

    // Update episode
    const updatedEpisode = await prisma.episode.update({
      where: { id: episodeId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
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
      createEvent('episode:updated', 'episode', episodeId, user.id, undefined, {
        showId: id,
        updatedFields: Object.keys(data),
      })
    ).catch(() => {});

    return NextResponse.json({ episode: updatedEpisode });
  },
  [withErrorHandling, withAuth, withAudit('episode.update')]
);

// DELETE /api/newsroom/shows/[id]/episodes/[episodeId] - Delete an episode
const deleteEpisode = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canDeleteShow(user.staffRole as any)) {
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

    // Delete episode (this will cascade delete audio clips)
    await prisma.episode.delete({
      where: { id: episodeId },
    });

    return NextResponse.json({ message: 'Episode deleted successfully' });
  },
  [withErrorHandling, withAuth, withAudit('episode.delete')]
);

export const GET = getEpisode;
export const PATCH = updateEpisode;
export const DELETE = deleteEpisode;
