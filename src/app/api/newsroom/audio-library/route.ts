import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { audioLibrarySearchSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';

// GET /api/newsroom/audio-library - List/search audio clips
// Audio clips always belong to stories — the library is a view of all story audio
const getAudioClips = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!user.staffRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams);

    const { query, tags, page, perPage } = audioLibrarySearchSchema.parse({
      ...searchParams,
      page: searchParams.page ? Number(searchParams.page) : 1,
      perPage: searchParams.perPage ? Number(searchParams.perPage) : 20,
      tags: searchParams.tags ? searchParams.tags.split(',') : undefined,
    });

    const where: Prisma.AudioClipWhereInput = {};

    // Text search across title, originalName, tags, and source story title
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { originalName: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
        { sourceStory: { title: { contains: query, mode: 'insensitive' } } },
      ];
    }

    // Tag filter
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const total = await prisma.audioClip.count({ where });

    const clips = await prisma.audioClip.findMany({
      where,
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
        _count: {
          select: {
            stories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({
      clips,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  },
  [withErrorHandling, withAuth]
);

export { getAudioClips as GET };
