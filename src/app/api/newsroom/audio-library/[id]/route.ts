import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { audioLibraryUpdateSchema } from '@/lib/validations';
import { deleteAudioFile } from '@/lib/r2-storage';

// GET /api/newsroom/audio-library/[id] - Get single clip details
const getAudioClip = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!user.staffRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const clip = await prisma.audioClip.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        originalName: true,
        url: true,
        duration: true,
        fileSize: true,
        mimeType: true,
        title: true,
        description: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        sourceStory: {
          select: {
            id: true,
            title: true,
          },
        },
        stories: {
          select: {
            id: true,
            story: {
              select: {
                id: true,
                title: true,
              },
            },
            createdAt: true,
          },
        },
        _count: {
          select: {
            stories: true,
          },
        },
      },
    });

    if (!clip) {
      return NextResponse.json({ error: 'Audio clip not found' }, { status: 404 });
    }

    return NextResponse.json(clip);
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/audio-library/[id] - Update clip metadata
const updateAudioClip = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!user.staffRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const clip = await prisma.audioClip.findUnique({
      where: { id },
      select: { uploadedBy: true },
    });

    if (!clip) {
      return NextResponse.json({ error: 'Audio clip not found' }, { status: 404 });
    }

    // Permission: uploader or SUB_EDITOR+
    const isUploader = clip.uploadedBy === user.id;
    const isSenior = ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user.staffRole!);
    if (!isUploader && !isSenior) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const data = audioLibraryUpdateSchema.parse(body);

    const updated = await prisma.audioClip.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  },
  [withErrorHandling, withAuth, withAudit('audio-library.update')]
);

// DELETE /api/newsroom/audio-library/[id] - Delete clip from library
const deleteAudioClipHandler = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!user.staffRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const clip = await prisma.audioClip.findUnique({
      where: { id },
      select: {
        uploadedBy: true,
        url: true,
        _count: { select: { stories: true } },
      },
    });

    if (!clip) {
      return NextResponse.json({ error: 'Audio clip not found' }, { status: 404 });
    }

    // Permission: uploader or EDITOR+
    const isUploader = clip.uploadedBy === user.id;
    const isEditor = ['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user.staffRole!);
    if (!isUploader && !isEditor) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete from storage
    try {
      await deleteAudioFile(clip.url);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
    }

    // Cascade deletes StoryAudioClip links automatically
    await prisma.audioClip.delete({ where: { id } });

    return NextResponse.json({
      message: 'Audio clip deleted successfully',
      affectedStories: clip._count.stories,
    });
  },
  [withErrorHandling, withAuth, withAudit('audio-library.delete')]
);

export { getAudioClip as GET, updateAudioClip as PATCH, deleteAudioClipHandler as DELETE };
