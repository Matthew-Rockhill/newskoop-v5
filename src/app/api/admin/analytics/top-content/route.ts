import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTopContent } from '@/lib/analytics';
import { ContentType } from '@prisma/client';

/**
 * GET /api/admin/analytics/top-content
 * Get most viewed content
 *
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - contentType: optional content type filter (STORY, BULLETIN, SHOW, EPISODE)
 * - stationId: optional station filter
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
    const contentType = url.searchParams.get('contentType') as ContentType | undefined;
    const stationId = url.searchParams.get('stationId') || undefined;
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

    // Validate contentType if provided
    if (contentType && !['STORY', 'BULLETIN', 'SHOW', 'EPISODE'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid contentType' },
        { status: 400 }
      );
    }

    // Get top content
    const topContent = await getTopContent({
      startDate,
      endDate,
      contentType,
      stationId,
      limit,
    });

    return NextResponse.json(topContent);
  } catch (error) {
    console.error('Top content analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top content' },
      { status: 500 }
    );
  }
}
