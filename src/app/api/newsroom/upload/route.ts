import { NextRequest, NextResponse } from 'next/server';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { createPresignedUpload, ALLOWED_AUDIO_TYPES, MAX_AUDIO_SIZE } from '@/lib/r2-storage';

// POST /api/newsroom/upload — Get presigned URL for direct-to-R2 upload
const getPresignedUrl = createHandler(
  async (req: NextRequest) => {
    const body = await req.json();
    const { filename, contentType, fileSize, folder } = body as {
      filename: string;
      contentType: string;
      fileSize: number;
      folder?: string;
    };

    if (!filename || !contentType || !fileSize) {
      return NextResponse.json(
        { error: 'filename, contentType, and fileSize are required' },
        { status: 400 },
      );
    }

    if (!ALLOWED_AUDIO_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid file type: ${contentType}. Only MP3, WAV, OGG, M4A, AAC, and WebM files are allowed.` },
        { status: 400 },
      );
    }

    if (fileSize > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 100MB.` },
        { status: 400 },
      );
    }

    const { presignedUrl, key, publicUrl } = await createPresignedUpload(
      filename,
      contentType,
      folder || 'newsroom/audio',
    );

    return NextResponse.json({ presignedUrl, key, publicUrl });
  },
  [withErrorHandling, withAuth],
);

export const POST = getPresignedUrl;
