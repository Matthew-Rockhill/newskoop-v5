import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { saveUploadedFile, validateAudioFile } from '@/lib/file-upload';
import { deleteAudioFile } from '@/lib/vercel-blob';

// Helper function to check if user can edit story
async function canEditStory(userId: string, userRole: string | null, storyId: string) {
  if (!userRole) return false;

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true, assignedToId: true, reviewerId: true, status: true },
  });

  if (!story) return false;

  // Editors and above can edit any story
  if (['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
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

// POST /api/newsroom/stories/[id]/audio - Add audio file to story
const addAudioClip = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id: storyId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    // Check permissions
    const canEdit = await canEditStory(user.id, user.staffRole, storyId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify story exists
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Handle FormData for file upload
    const formData = await req.formData();
    const audioFile = formData.get('audioFile') as File;
    const description = (formData.get('description') as string) || '';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Validate audio file
    const validation = validateAudioFile(audioFile);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Upload file
    const uploadedFile = await saveUploadedFile(audioFile);

    // Create audio clip record
    const audioClip = await prisma.audioClip.create({
      data: {
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalName,
        url: uploadedFile.url,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimeType,
        description,
        duration: uploadedFile.duration,
        storyId,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json(audioClip, { status: 201 });
  },
  [withErrorHandling, withAuth, withAudit('audio.create')]
);

// DELETE /api/newsroom/stories/[id]/audio - Remove audio file from story
const removeAudioClip = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id: storyId } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    // Check permissions
    const canEdit = await canEditStory(user.id, user.staffRole, storyId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const audioClipId = url.searchParams.get('clipId');

    if (!audioClipId) {
      return NextResponse.json({ error: 'Audio clip ID is required' }, { status: 400 });
    }

    // Find the audio clip
    const audioClip = await prisma.audioClip.findUnique({
      where: { id: audioClipId },
      select: { id: true, url: true, storyId: true },
    });

    if (!audioClip) {
      return NextResponse.json({ error: 'Audio clip not found' }, { status: 404 });
    }

    // Verify the clip belongs to this story
    if (audioClip.storyId !== storyId) {
      return NextResponse.json({ error: 'Audio clip does not belong to this story' }, { status: 400 });
    }

    // Delete from storage
    try {
      await deleteAudioFile(audioClip.url);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.audioClip.delete({
      where: { id: audioClipId },
    });

    return NextResponse.json({ message: 'Audio clip deleted successfully' });
  },
  [withErrorHandling, withAuth, withAudit('audio.delete')]
);

export { addAudioClip as POST, removeAudioClip as DELETE };