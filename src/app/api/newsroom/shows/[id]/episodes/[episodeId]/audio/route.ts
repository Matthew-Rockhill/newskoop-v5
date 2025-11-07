import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canManageShows } from '@/lib/permissions';
import { saveUploadedFile, validateAudioFile } from '@/lib/file-upload';
import { del } from '@vercel/blob';

// POST /api/newsroom/shows/[id]/episodes/[episodeId]/audio - Upload audio file
const uploadAudio = createHandler(
  async (req: NextRequest, { params }: { params: { id: string; episodeId: string } }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canManageShows(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const episode = await prisma.episode.findUnique({
      where: { id: params.episodeId },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.showId !== params.id) {
      return NextResponse.json({ error: 'Episode does not belong to this show' }, { status: 400 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const audioClips = [];

    for (const file of files) {
      // Validate audio file
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Save file to Vercel Blob
      const uploadedFile = await saveUploadedFile(file, 'newsroom/shows/audio');

      // Create audio clip record
      const audioClip = await prisma.audioClip.create({
        data: {
          filename: uploadedFile.filename,
          originalName: file.name,
          url: uploadedFile.url,
          fileSize: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          episodeId: params.episodeId,
          uploadedBy: user.id,
        },
      });

      audioClips.push(audioClip);
    }

    // Calculate total duration if we have audio clips
    const totalDuration = audioClips.reduce((sum, clip) => sum + (clip.duration || 0), 0);

    // Update episode duration
    if (totalDuration > 0) {
      await prisma.episode.update({
        where: { id: params.episodeId },
        data: { duration: totalDuration },
      });
    }

    // Fetch the complete updated episode with all audio clips
    const updatedEpisode = await prisma.episode.findUnique({
      where: { id: params.episodeId },
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

    return NextResponse.json({ episode: updatedEpisode, audioClips });
  },
  [withErrorHandling, withAuth, withAudit('episode.audio.upload')]
);

// DELETE /api/newsroom/shows/[id]/episodes/[episodeId]/audio - Delete audio file
const deleteAudio = createHandler(
  async (req: NextRequest, { params }: { params: { id: string; episodeId: string } }) => {
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

    if (audioClip.episodeId !== params.episodeId) {
      return NextResponse.json({ error: 'Audio clip does not belong to this episode' }, { status: 400 });
    }

    // Delete from Vercel Blob
    try {
      await del(audioClip.url);
    } catch (error) {
      console.error('Failed to delete audio file from blob:', error);
    }

    // Delete database record
    await prisma.audioClip.delete({
      where: { id: audioClipId },
    });

    // Recalculate episode duration
    const remainingClips = await prisma.audioClip.findMany({
      where: { episodeId: params.episodeId },
    });

    const totalDuration = remainingClips.reduce((sum, clip) => sum + (clip.duration || 0), 0);

    await prisma.episode.update({
      where: { id: params.episodeId },
      data: { duration: totalDuration || null },
    });

    // Fetch the complete updated episode with remaining audio clips
    const updatedEpisode = await prisma.episode.findUnique({
      where: { id: params.episodeId },
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
