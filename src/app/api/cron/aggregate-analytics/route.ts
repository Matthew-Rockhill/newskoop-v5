import { NextRequest, NextResponse } from 'next/server';
import { aggregateDailyViews, archiveOldViews } from '@/lib/analytics';
import { subDays } from 'date-fns';

/**
 * GET /api/cron/aggregate-analytics
 * Cron job to aggregate analytics and archive old data
 *
 * This should be scheduled to run daily via Vercel Cron or similar
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/aggregate-analytics",
 *     "schedule": "0 2 * * *"  // 2 AM daily
 *   }]
 * }
 *
 * For manual testing, call with: ?secret=YOUR_CRON_SECRET
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authorization
    // Vercel Cron sends this header automatically
    const authHeader = req.headers.get('authorization');
    const urlSecret = new URL(req.url).searchParams.get('secret');

    const expectedSecret = process.env.CRON_SECRET || 'dev-cron-secret';

    // Check either Vercel Cron header or manual secret param
    const isAuthorized =
      authHeader === `Bearer ${expectedSecret}` || urlSecret === expectedSecret;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      aggregation: [],
      archival: null,
    };

    // Aggregate yesterday's views
    const yesterday = subDays(new Date(), 1);
    const yesterdayResult = await aggregateDailyViews(yesterday);
    results.aggregation.push({
      date: yesterday.toISOString().split('T')[0],
      ...yesterdayResult,
    });

    // Also aggregate today's views (for real-time-ish data)
    const today = new Date();
    const todayResult = await aggregateDailyViews(today);
    results.aggregation.push({
      date: today.toISOString().split('T')[0],
      ...todayResult,
    });

    // Archive old views (only on first day of month)
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth === 1) {
      console.log('First day of month - archiving old views');
      results.archival = await archiveOldViews(90); // Keep 90 days
    }

    console.log('Analytics aggregation completed:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Analytics aggregation error:', error);
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

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}
