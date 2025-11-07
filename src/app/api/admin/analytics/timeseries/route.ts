import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTimeSeriesData } from '@/lib/analytics';
import { ContentType } from '@prisma/client';

/**
 * GET /api/admin/analytics/timeseries
 * Get time-series data for charts
 *
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - stationId: optional station filter
 * - contentType: optional content type filter (STORY, BULLETIN, SHOW, EPISODE)
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
    const stationId = url.searchParams.get('stationId') || undefined;
    const contentType = url.searchParams.get('contentType') as ContentType | undefined;

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

    // Validate contentType if provided
    if (contentType && !['STORY', 'BULLETIN', 'SHOW', 'EPISODE'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid contentType' },
        { status: 400 }
      );
    }

    // Get time-series data
    const data = await getTimeSeriesData({
      startDate,
      endDate,
      stationId,
      contentType,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Time-series analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time-series data' },
      { status: 500 }
    );
  }
}
