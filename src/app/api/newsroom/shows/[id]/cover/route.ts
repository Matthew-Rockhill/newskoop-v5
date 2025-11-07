import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { canEditShow } from '@/lib/permissions';
import { put, del } from '@vercel/blob';

// POST /api/newsroom/shows/[id]/cover - Upload cover image
const uploadCover = createHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    const show = await prisma.show.findUnique({
      where: { id: params.id },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    if (!canEditShow(user.staffRole as any, show.createdById, user.id)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Delete old cover image if exists
    if (show.coverImage) {
      try {
        await del(show.coverImage);
      } catch (error) {
        console.error('Failed to delete old cover image:', error);
      }
    }

    // Upload to Vercel Blob
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `newsroom/shows/covers/${timestamp}-${sanitizedName}`;

    const blob = await put(filename, file, {
      access: 'public',
    });

    // Update show with new cover image URL
    const updatedShow = await prisma.show.update({
      where: { id: params.id },
      data: {
        coverImage: blob.url,
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({
      show: updatedShow,
      coverImage: blob.url,
    });
  },
  [withErrorHandling, withAuth, withAudit('show.cover.upload')]
);

// DELETE /api/newsroom/shows/[id]/cover - Delete cover image
const deleteCover = createHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    const show = await prisma.show.findUnique({
      where: { id: params.id },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    if (!canEditShow(user.staffRole as any, show.createdById, user.id)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!show.coverImage) {
      return NextResponse.json({ error: 'No cover image to delete' }, { status: 400 });
    }

    // Delete from Vercel Blob
    try {
      await del(show.coverImage);
    } catch (error) {
      console.error('Failed to delete cover image:', error);
    }

    // Update show
    const updatedShow = await prisma.show.update({
      where: { id: params.id },
      data: {
        coverImage: null,
      },
    });

    return NextResponse.json({ show: updatedShow });
  },
  [withErrorHandling, withAuth, withAudit('show.cover.delete')]
);

export const POST = uploadCover;
export const DELETE = deleteCover;
