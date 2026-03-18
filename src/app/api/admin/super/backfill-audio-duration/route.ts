import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseBuffer } from 'music-metadata';

/**
 * GET /api/admin/super/backfill-audio-duration
 * Count clips missing duration
 * SUPERADMIN only
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).staffRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const missingCount = await prisma.audioClip.count({
      where: { duration: null },
    });

    const totalCount = await prisma.audioClip.count();

    return NextResponse.json({ missingCount, totalCount });
  } catch (error) {
    console.error('Error counting clips:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/super/backfill-audio-duration
 * Download each clip with null duration, parse it, and update the record
 * Processes in batches of 10 to avoid timeouts
 * SUPERADMIN only
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).staffRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const BATCH_SIZE = 10;

    const clips = await prisma.audioClip.findMany({
      where: { duration: null },
      select: { id: true, url: true, mimeType: true, originalName: true },
      take: BATCH_SIZE,
    });

    if (clips.length === 0) {
      return NextResponse.json({ updated: 0, remaining: 0, message: 'All clips have duration' });
    }

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const clip of clips) {
      try {
        const response = await fetch(clip.url);
        if (!response.ok) {
          errors.push(`${clip.originalName}: HTTP ${response.status}`);
          failed++;
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const metadata = await parseBuffer(buffer, { mimeType: clip.mimeType });
        const duration = metadata.format.duration ? Math.round(metadata.format.duration) : null;

        if (duration !== null) {
          await prisma.audioClip.update({
            where: { id: clip.id },
            data: { duration },
          });
          updated++;
        } else {
          errors.push(`${clip.originalName}: no duration in metadata`);
          failed++;
        }
      } catch (err) {
        errors.push(`${clip.originalName}: ${err instanceof Error ? err.message : 'unknown error'}`);
        failed++;
      }
    }

    const remaining = await prisma.audioClip.count({ where: { duration: null } });

    return NextResponse.json({
      updated,
      failed,
      remaining,
      errors: errors.length > 0 ? errors : undefined,
      message: remaining > 0
        ? `Updated ${updated}, ${remaining} remaining. Run again to continue.`
        : `All done! Updated ${updated} clips.`,
    });
  } catch (error) {
    console.error('Error backfilling duration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
