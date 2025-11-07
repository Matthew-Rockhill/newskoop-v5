import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStationActivity } from '@/lib/analytics';

/**
 * GET /api/admin/analytics/stations
 * Get station activity summary
 *
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - limit: number of results (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication and authorization
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only STAFF users with ADMIN/SUPERADMIN role can access
    if (
      session.user.userType !== 'STAFF' ||
      !['ADMIN', 'SUPERADMIN'].includes(session.user.staffRole || '')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Validate dates
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Get station activity
    const stationActivity = await getStationActivity({
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json(stationActivity);
  } catch (error) {
    console.error('Station activity analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station activity' },
      { status: 500 }
    );
  }
}
