import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canManageShows } from '@/lib/permissions';
import { saveUploadedFile, validateAudioFile } from '@/lib/file-upload';
import { deleteAudioFile } from '@/lib/r2-storage';

// Maximum audio clips allowed per episode
const MAX_AUDIO_CLIPS_PER_EPISODE = 5;

// Helper to fetch and return the full episode after audio changes
async function getFullEpisode(episodeId: string) {
  return prisma.episode.findUnique({
    where: { id: episodeId },
    include: {
      audioClips: true,
      show: true,
      publisher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

// POST /api/newsroom/shows/[id]/episodes/[episodeId]/audio - Upload audio file or link library clips
const uploadAudio = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canManageShows(user.staffRole as any)) {
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

    const contentType = req.headers.get('content-type') || '';

    // JSON body: link existing library clips to episode
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { audioClipIds } = body;

      if (!Array.isArray(audioClipIds) || audioClipIds.length === 0) {
        return NextResponse.json({ error: 'audioClipIds array is required' }, { status: 400 });
      }

      const existingClipCount = episode._count.audioClips;
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

      // Verify all clips exist and are not already attached to another episode
      const clips = await prisma.audioClip.findMany({
        where: { id: { in: audioClipIds } },
        select: { id: true, episodeId: true },
      });

      const validClipIds = clips
        .filter(c => c.episodeId === null || c.episodeId === episodeId)
        .map(c => c.id);

      if (validClipIds.length === 0) {
        return NextResponse.json({ error: 'No valid audio clips to link' }, { status: 400 });
      }

      // Update each clip to belong to this episode
      await prisma.audioClip.updateMany({
        where: { id: { in: validClipIds }, episodeId: null },
        data: { episodeId },
      });

      const updatedEpisode = await getFullEpisode(episodeId);
      return NextResponse.json({ episode: updatedEpisode, linked: validClipIds.length });
    }

    // Multipart: existing file upload flow
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Check if adding new files would exceed the limit
    const existingClipCount = episode._count.audioClips;
    const remainingSlots = MAX_AUDIO_CLIPS_PER_EPISODE - existingClipCount;

    if (remainingSlots <= 0) {
      return NextResponse.json({
        error: `Maximum ${MAX_AUDIO_CLIPS_PER_EPISODE} audio clips allowed per episode`
      }, { status: 400 });
    }

    if (files.length > remainingSlots) {
      return NextResponse.json({
        error: `Can only upload ${remainingSlots} more audio clip${remainingSlots === 1 ? '' : 's'}. Episode already has ${existingClipCount} clip${existingClipCount === 1 ? '' : 's'}.`
      }, { status: 400 });
    }

    const audioClips = [];

    for (const file of files) {
      // Validate audio file
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Save file to R2 storage
      const uploadedFile = await saveUploadedFile(file, 'newsroom/shows/audio');

      // Create audio clip record
      const audioClip = await prisma.audioClip.create({
        data: {
          filename: uploadedFile.filename,
          originalName: file.name,
          url: uploadedFile.url,
          fileSize: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          episodeId: episodeId,
          uploadedBy: user.id,
        },
      });

      audioClips.push(audioClip);
    }

    // Calculate total duration if we have audio clips
    const totalDuration = audioClips.reduce((sum, clip) => sum + (clip.duration ?? 0), 0);

    // Update episode duration
    if (totalDuration > 0) {
      await prisma.episode.update({
        where: { id: episodeId },
        data: { duration: totalDuration },
      });
    }

    // Fetch the complete updated episode with all audio clips
    const updatedEpisode = await getFullEpisode(episodeId);

    return NextResponse.json({ episode: updatedEpisode, audioClips });
  },
  [withErrorHandling, withAuth, withAudit('episode.audio.upload')]
);

// DELETE /api/newsroom/shows/[id]/episodes/[episodeId]/audio - Delete audio file
const deleteAudio = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id: _id, episodeId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canManageShows(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const audioClipId = url.searchParams.get('audioClipId');

    if (!audioClipId) {
      return NextResponse.json({ error: 'Audio clip ID is required' }, { status: 400 });
    }

    const audioClip = await prisma.audioClip.findUnique({
      where: { id: audioClipId },
    });

    if (!audioClip) {
      return NextResponse.json({ error: 'Audio clip not found' }, { status: 404 });
    }

    if (audioClip.episodeId !== episodeId) {
      return NextResponse.json({ error: 'Audio clip does not belong to this episode' }, { status: 400 });
    }

    // Delete from R2 storage
    try {
      await deleteAudioFile(audioClip.url);
    } catch (error) {
      console.error('Failed to delete audio file from R2:', error);
    }

    // Delete database record
    await prisma.audioClip.delete({
      where: { id: audioClipId },
    });

    // Recalculate episode duration
    const remainingClips = await prisma.audioClip.findMany({
      where: { episodeId: episodeId },
    });

    const totalDuration = remainingClips.reduce((sum, clip) => sum + (clip.duration ?? 0), 0);

    await prisma.episode.update({
      where: { id: episodeId },
      data: { duration: totalDuration > 0 ? totalDuration : null },
    });

    // Fetch the complete updated episode with remaining audio clips
    const updatedEpisode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        audioClips: true,
        show: true,
        publisher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ message: 'Audio clip deleted successfully', episode: updatedEpisode });
  },
  [withErrorHandling, withAuth, withAudit('episode.audio.delete')]
);

export const POST = uploadAudio;
export const DELETE = deleteAudio;
