import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canManageShows } from '@/lib/permissions';
import { deleteAudioFile } from '@/lib/r2-storage';

// Maximum audio clips allowed per episode
const MAX_AUDIO_CLIPS_PER_EPISODE = 5;

// Flatten episode audioClips from join-table format to flat AudioClip objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenEpisodeAudio(episode: any) {
  if (!episode) return episode;
  return {
    ...episode,
    audioClips: episode.audioClips?.map((eac: any) => eac.audioClip) || [],
  };
}

// Reusable include for episode audio via join table
const episodeAudioInclude = {
  audioClips: {
    select: {
      id: true,
      audioClip: {
        select: {
          id: true,
          filename: true,
          originalName: true,
          url: true,
          duration: true,
          fileSize: true,
          mimeType: true,
          title: true,
          tags: true,
          createdAt: true,
        },
      },
      createdAt: true,
    },
  },
  show: true,
  publisher: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

// Helper to recalculate and update episode duration from linked clips
async function recalculateEpisodeDuration(episodeId: string) {
  const links = await prisma.episodeAudioClip.findMany({
    where: { episodeId },
    select: { audioClip: { select: { duration: true } } },
  });
  const totalDuration = links.reduce((sum, link) => sum + (link.audioClip.duration ?? 0), 0);
  await prisma.episode.update({
    where: { id: episodeId },
    data: { duration: totalDuration > 0 ? totalDuration : null },
  });
}

// POST /api/newsroom/shows/[id]/episodes/[episodeId]/audio - Upload audio file or link library clips
const uploadAudio = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null; isContentProducer: boolean } }).user;

    if (!canManageShows(user.staffRole as any, user.isContentProducer)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        _count: {
          select: { audioClips: true },
        },
      },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.showId !== id) {
      return NextResponse.json({ error: 'Episode does not belong to this show' }, { status: 400 });
    }

    const existingClipCount = episode._count.audioClips;

    const body = await req.json();

    // Mode 1: Link existing library clips to episode
    if (body.audioClipIds) {
      const { audioClipIds } = body;

      if (!Array.isArray(audioClipIds) || audioClipIds.length === 0) {
        return NextResponse.json({ error: 'audioClipIds array is required' }, { status: 400 });
      }

      const remainingSlots = MAX_AUDIO_CLIPS_PER_EPISODE - existingClipCount;

      if (remainingSlots <= 0) {
        return NextResponse.json({
          error: `Maximum ${MAX_AUDIO_CLIPS_PER_EPISODE} audio clips allowed per episode`
        }, { status: 400 });
      }

      if (audioClipIds.length > remainingSlots) {
        return NextResponse.json({
          error: `Can only add ${remainingSlots} more audio clip${remainingSlots === 1 ? '' : 's'}. Episode already has ${existingClipCount} clip${existingClipCount === 1 ? '' : 's'}.`
        }, { status: 400 });
      }

      // Verify all clips exist
      const clips = await prisma.audioClip.findMany({
        where: { id: { in: audioClipIds } },
        select: { id: true },
      });

      const validClipIds = clips.map(c => c.id);

      if (validClipIds.length === 0) {
        return NextResponse.json({ error: 'No valid audio clips to link' }, { status: 400 });
      }

      // Create join table links (skip duplicates via unique constraint)
      const links = await Promise.all(
        validClipIds.map(async (clipId) => {
          try {
            return await prisma.episodeAudioClip.create({
              data: {
                episodeId,
                audioClipId: clipId,
                addedBy: user.id,
              },
            });
          } catch {
            // Skip duplicates
            return null;
          }
        })
      );

      await recalculateEpisodeDuration(episodeId);

      const updatedEpisode = await prisma.episode.findUnique({
        where: { id: episodeId },
        include: episodeAudioInclude,
      });

      return NextResponse.json({ episode: flattenEpisodeAudio(updatedEpisode), linked: links.filter(Boolean).length });
    }

    // Mode 2: Confirm direct uploads — client already uploaded to R2 via presigned URL
    const { uploads } = body as {
      uploads: Array<{
        key: string;
        publicUrl: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
        duration?: number;
      }>;
    };

    if (!Array.isArray(uploads) || uploads.length === 0) {
      return NextResponse.json({ error: 'uploads array or audioClipIds is required' }, { status: 400 });
    }

    const remainingSlots = MAX_AUDIO_CLIPS_PER_EPISODE - existingClipCount;

    if (remainingSlots <= 0) {
      return NextResponse.json({
        error: `Maximum ${MAX_AUDIO_CLIPS_PER_EPISODE} audio clips allowed per episode`
      }, { status: 400 });
    }

    if (uploads.length > remainingSlots) {
      return NextResponse.json({
        error: `Can only upload ${remainingSlots} more audio clip${remainingSlots === 1 ? '' : 's'}. Episode already has ${existingClipCount} clip${existingClipCount === 1 ? '' : 's'}.`
      }, { status: 400 });
    }

    const audioClips = [];

    for (const upload of uploads) {
      const audioClip = await prisma.audioClip.create({
        data: {
          filename: upload.key,
          originalName: upload.originalName,
          url: upload.publicUrl,
          fileSize: upload.fileSize,
          mimeType: upload.mimeType,
          duration: upload.duration ?? null,
          uploadedBy: user.id,
          episodes: {
            create: {
              episodeId,
              addedBy: user.id,
            },
          },
        },
      });

      audioClips.push(audioClip);
    }

    await recalculateEpisodeDuration(episodeId);

    const updatedEpisode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: episodeAudioInclude,
    });

    return NextResponse.json({ episode: flattenEpisodeAudio(updatedEpisode), audioClips });
  },
  [withErrorHandling, withAuth, withAudit('episode.audio.upload')]
);

// DELETE /api/newsroom/shows/[id]/episodes/[episodeId]/audio - Unlink/delete audio from episode
const deleteAudio = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id: _id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null; isContentProducer: boolean } }).user;

    if (!canManageShows(user.staffRole as any, user.isContentProducer)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const audioClipId = url.searchParams.get('audioClipId');

    if (!audioClipId) {
      return NextResponse.json({ error: 'Audio clip ID is required' }, { status: 400 });
    }

    // Verify the link exists
    const link = await prisma.episodeAudioClip.findUnique({
      where: {
        episodeId_audioClipId: {
          episodeId,
          audioClipId,
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: 'Audio clip is not linked to this episode' }, { status: 404 });
    }

    // Check if clip has other links (stories or other episodes)
    const audioClip = await prisma.audioClip.findUnique({
      where: { id: audioClipId },
      select: {
        url: true,
        _count: {
          select: {
            stories: true,
            episodes: true,
          },
        },
      },
    });

    // Remove the episode link
    await prisma.episodeAudioClip.delete({
      where: { id: link.id },
    });

    // If clip has no other links, delete it entirely (storage + DB)
    if (audioClip && audioClip._count.stories === 0 && audioClip._count.episodes <= 1) {
      try {
        await deleteAudioFile(audioClip.url);
      } catch (error) {
        console.error('Failed to delete audio file from R2:', error);
      }
      await prisma.audioClip.delete({
        where: { id: audioClipId },
      });
    }

    await recalculateEpisodeDuration(episodeId);

    const updatedEpisode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: episodeAudioInclude,
    });

    return NextResponse.json({ message: 'Audio clip removed from episode', episode: flattenEpisodeAudio(updatedEpisode) });
  },
  [withErrorHandling, withAuth, withAudit('episode.audio.delete')]
);

export const POST = uploadAudio;
export const DELETE = deleteAudio;
