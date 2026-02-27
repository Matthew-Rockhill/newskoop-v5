import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOverviewStats } from '@/lib/analytics';
import { getAuditLogs } from '@/lib/audit';
import { startOfWeek } from 'date-fns';

/**
 * GET /api/admin/dashboard-stats
 * Returns live dashboard statistics for the admin panel
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      session.user.userType !== 'STAFF' ||
      !['ADMIN', 'SUPERADMIN'].includes(session.user.staffRole || '')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all stats in parallel
    const [
      staffCount,
      radioCount,
      activeStationCount,
      totalStationCount,
      publishedThisWeek,
      contentStats,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count({ where: { userType: 'STAFF' } }),
      prisma.user.count({ where: { userType: 'RADIO' } }),
      prisma.station.count({ where: { isActive: true } }),
      prisma.station.count(),
      prisma.story.count({
        where: {
          stage: 'PUBLISHED',
          publishedAt: { gte: weekStart },
        },
      }),
      getOverviewStats({
        startDate: thirtyDaysAgo,
        endDate: now,
      }),
      getAuditLogs({ perPage: 10 }),
    ]);

    return NextResponse.json({
      users: {
        total: staffCount + radioCount,
        staff: staffCount,
        radio: radioCount,
      },
      stations: {
        active: activeStationCount,
        total: totalStationCount,
      },
      publishedThisWeek,
      contentViews30d: contentStats.totalViews,
      recentActivity: recentActivity.logs,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
