import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canEditPodcast } from '@/lib/permissions';
import { put, del } from '@vercel/blob';

// POST /api/newsroom/podcasts/[id]/cover
const uploadCover = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    const podcast = await prisma.podcast.findUnique({ where: { id } });

    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    if (!canEditPodcast(user.staffRole as any, podcast.createdById, user.id)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 });
    }

    if (podcast.coverImage) {
      try { await del(podcast.coverImage); } catch (error) {
        console.error('Failed to delete old cover image:', error);
      }
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `newsroom/podcasts/covers/${timestamp}-${sanitizedName}`;

    const blob = await put(filename, file, { access: 'public' });

    const updatedPodcast = await prisma.podcast.update({
      where: { id },
      data: { coverImage: blob.url },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ podcast: updatedPodcast, coverImage: blob.url });
  },
  [withErrorHandling, withAuth, withAudit('podcast.cover.upload')]
);

// DELETE /api/newsroom/podcasts/[id]/cover
const deleteCover = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    const podcast = await prisma.podcast.findUnique({ where: { id } });

    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    if (!canEditPodcast(user.staffRole as any, podcast.createdById, user.id)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!podcast.coverImage) {
      return NextResponse.json({ error: 'No cover image to delete' }, { status: 400 });
    }

    try { await del(podcast.coverImage); } catch (error) {
      console.error('Failed to delete cover image:', error);
    }

    const updatedPodcast = await prisma.podcast.update({
      where: { id },
      data: { coverImage: null },
    });

    return NextResponse.json({ podcast: updatedPodcast });
  },
  [withErrorHandling, withAuth, withAudit('podcast.cover.delete')]
);

export const POST = uploadCover;
export const DELETE = deleteCover;
