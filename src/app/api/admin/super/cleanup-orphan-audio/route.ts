import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteAudioFile } from '@/lib/r2-storage';

/**
 * GET /api/admin/super/cleanup-orphan-audio
 * Count orphan audio clips (no story or episode links)
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

    const orphanCount = await prisma.audioClip.count({
      where: {
        stories: { none: {} },
        episodes: { none: {} },
      },
    });

    return NextResponse.json({ orphanCount });
  } catch (error) {
    console.error('Error counting orphan audio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/super/cleanup-orphan-audio
 * Delete orphan audio clips (no story or episode links)
 * Removes from R2 storage and database
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

    // Find all orphan clips
    const orphans = await prisma.audioClip.findMany({
      where: {
        stories: { none: {} },
        episodes: { none: {} },
      },
      select: { id: true, url: true, originalName: true },
    });

    if (orphans.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'No orphan audio clips found' });
    }

    let storageDeleted = 0;
    let storageFailed = 0;

    // Delete from R2 storage first
    for (const clip of orphans) {
      try {
        await deleteAudioFile(clip.url);
        storageDeleted++;
      } catch {
        storageFailed++;
      }
    }

    // Delete from database
    const result = await prisma.audioClip.deleteMany({
      where: {
        id: { in: orphans.map(c => c.id) },
      },
    });

    return NextResponse.json({
      deleted: result.count,
      storageDeleted,
      storageFailed,
      message: `Cleaned up ${result.count} orphan audio clip${result.count !== 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('Error cleaning up orphan audio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
