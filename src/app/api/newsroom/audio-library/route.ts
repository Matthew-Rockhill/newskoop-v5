import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { audioLibrarySearchSchema } from '@/lib/validations';
import { saveUploadedFile, validateAudioFile } from '@/lib/file-upload';
import { Prisma } from '@prisma/client';

// GET /api/newsroom/audio-library - List/search audio clips
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

    // Exclude episode-only clips (clips with episodeId but no library relevance)
    where.episodeId = null;

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

// POST /api/newsroom/audio-library - Upload new clip to library
const uploadAudioClip = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!user.staffRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audioFile') as File;
    const title = (formData.get('title') as string) || null;
    const description = (formData.get('description') as string) || null;
    const tagsRaw = formData.get('tags') as string;
    const tags = tagsRaw ? JSON.parse(tagsRaw) : [];

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const validation = validateAudioFile(audioFile);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const uploadedFile = await saveUploadedFile(audioFile);

    const audioClip = await prisma.audioClip.create({
      data: {
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalName,
        url: uploadedFile.url,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimeType,
        duration: uploadedFile.duration,
        uploadedBy: user.id,
        title,
        description,
        tags,
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
        description: true,
        tags: true,
        createdAt: true,
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(audioClip, { status: 201 });
  },
  [withErrorHandling, withAuth, withAudit('audio-library.upload')]
);

export { getAudioClips as GET, uploadAudioClip as POST };
