import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOverviewStats } from '@/lib/analytics';

/**
 * GET /api/admin/analytics/overview
 * Get overview statistics for admin dashboard
 *
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - stationId: optional station filter
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

    // Get overview statistics
    const stats = await getOverviewStats({
      startDate,
      endDate,
      stationId,
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Overview analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview statistics' },
      { status: 500 }
    );
  }
}
