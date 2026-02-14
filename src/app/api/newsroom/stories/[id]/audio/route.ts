import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { saveUploadedFile, validateAudioFile } from '@/lib/file-upload';

// Helper function to check if user can edit story
async function canEditStory(userId: string, userRole: string | null, storyId: string) {
  if (!userRole) return false;

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true, assignedToId: true, reviewerId: true, status: true },
  });

  if (!story) return false;

  // Sub-editors and above can edit any story
  if (['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
    return true;
  }

  // Authors can edit their own stories if not published
  if (story.authorId === userId && story.status !== 'PUBLISHED') {
    return true;
  }

  // Assigned users can edit stories assigned to them
  if (story.assignedToId === userId || story.reviewerId === userId) {
    return true;
  }

  return false;
}

// POST /api/newsroom/stories/[id]/audio - Upload new audio or link existing clips
const addAudioClip = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id: storyId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    const canEdit = await canEditStory(user.id, user.staffRole, storyId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';

    // Mode 1: Link existing clips (JSON body with audioClipIds)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { audioClipIds } = body;

      if (!audioClipIds || !Array.isArray(audioClipIds) || audioClipIds.length === 0) {
        return NextResponse.json({ error: 'audioClipIds array is required' }, { status: 400 });
      }

      // Verify all clips exist
      const clips = await prisma.audioClip.findMany({
        where: { id: { in: audioClipIds } },
        select: { id: true },
      });

      if (clips.length !== audioClipIds.length) {
        return NextResponse.json({ error: 'Some audio clips not found' }, { status: 404 });
      }

      // Create links, skipping duplicates
      const links = await Promise.all(
        audioClipIds.map(async (clipId: string) => {
          try {
            return await prisma.storyAudioClip.create({
              data: {
                storyId,
                audioClipId: clipId,
                addedBy: user.id,
              },
              include: {
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
                  },
                },
              },
            });
          } catch {
            // Skip duplicates (unique constraint violation)
            return null;
          }
        })
      );

      return NextResponse.json({
        linked: links.filter(Boolean),
      }, { status: 201 });
    }

    // Mode 2: Upload new file (FormData)
    const formData = await req.formData();
    const audioFile = formData.get('audioFile') as File;
    const title = (formData.get('title') as string) || null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const validation = validateAudioFile(audioFile);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const uploadedFile = await saveUploadedFile(audioFile);

    // Create AudioClip in library with sourceStoryId, then link to story
    const audioClip = await prisma.audioClip.create({
      data: {
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalName,
        url: uploadedFile.url,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimeType,
        duration: uploadedFile.duration,
        uploadedBy: user.id,
        sourceStoryId: storyId,
        title,
        stories: {
          create: {
            storyId,
            addedBy: user.id,
          },
        },
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        url: true,
        duration: true,
        fileSize: true,
        mimeType: true,
        title: true,
        createdAt: true,
      },
    });

    return NextResponse.json(audioClip, { status: 201 });
  },
  [withErrorHandling, withAuth, withAudit('audio.create')]
);

// DELETE /api/newsroom/stories/[id]/audio - Unlink audio clip from story
const removeAudioClip = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id: storyId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    const canEdit = await canEditStory(user.id, user.staffRole, storyId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const audioClipId = url.searchParams.get('clipId');

    if (!audioClipId) {
      return NextResponse.json({ error: 'Audio clip ID is required' }, { status: 400 });
    }

    // Find and delete the link
    const link = await prisma.storyAudioClip.findUnique({
      where: {
        storyId_audioClipId: {
          storyId,
          audioClipId,
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: 'Audio clip is not linked to this story' }, { status: 404 });
    }

    // Unlink only - do NOT delete the AudioClip itself
    await prisma.storyAudioClip.delete({
      where: { id: link.id },
    });

    return NextResponse.json({ message: 'Audio clip unlinked from story' });
  },
  [withErrorHandling, withAuth, withAudit('audio.unlink')]
);

export { addAudioClip as POST, removeAudioClip as DELETE };
