import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/reset-bulletin-flags
 * Daily cron job to clear all bulletin flags.
 * Flags are treated as "today's picks" — they reset each day.
 *
 * Configured in vercel.json to run daily at midnight.
 * For manual testing: ?secret=YOUR_CRON_SECRET
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const urlSecret = new URL(req.url).searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'dev-cron-secret';

    const isAuthorized =
      authHeader === `Bearer ${expectedSecret}` || urlSecret === expectedSecret;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear all bulletin flags
    const result = await prisma.story.updateMany({
      where: { flaggedForBulletin: true },
      data: {
        flaggedForBulletin: false,
        flaggedForBulletinAt: null,
        flaggedForBulletinById: null,
      },
    });

    console.log(`Bulletin flags reset: ${result.count} stories unflagged`);

    return NextResponse.json({
      success: true,
      unflaggedCount: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Bulletin flag reset error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
