import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/stations/health
 * Returns health indicators for all stations (last view date, user count, total views)
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

    // Get all stations
    const stations = await prisma.station.findMany({
      select: { id: true },
    });

    const stationIds = stations.map((s) => s.id);

    if (stationIds.length === 0) {
      return NextResponse.json({});
    }

    // Batch query: latest view per station + view count + user count
    const [latestViews, viewCounts, userCounts] = await Promise.all([
      // Latest content view per station
      prisma.$queryRaw<Array<{ stationId: string; lastViewAt: Date }>>`
        SELECT "stationId", MAX("viewedAt") as "lastViewAt"
        FROM "ContentView"
        WHERE "stationId" = ANY(${stationIds})
        GROUP BY "stationId"
      `,
      // Total views per station (last 30d)
      prisma.contentView.groupBy({
        by: ['stationId'],
        where: {
          stationId: { in: stationIds },
          viewedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
      }),
      // User count per station
      prisma.user.groupBy({
        by: ['radioStationId'],
        where: {
          radioStationId: { in: stationIds },
        },
        _count: { id: true },
      }),
    ]);

    // Build lookup maps
    const healthMap: Record<string, { lastViewAt: string | null; views30d: number; userCount: number }> = {};

    // Initialize all stations
    for (const id of stationIds) {
      healthMap[id] = { lastViewAt: null, views30d: 0, userCount: 0 };
    }

    // Fill in latest views
    for (const row of latestViews) {
      if (row.stationId && healthMap[row.stationId]) {
        healthMap[row.stationId].lastViewAt = row.lastViewAt.toISOString();
      }
    }

    // Fill in view counts
    for (const row of viewCounts) {
      if (row.stationId && healthMap[row.stationId]) {
        healthMap[row.stationId].views30d = row._count.id;
      }
    }

    // Fill in user counts
    for (const row of userCounts) {
      if (row.radioStationId && healthMap[row.radioStationId]) {
        healthMap[row.radioStationId].userCount = row._count.id;
      }
    }

    return NextResponse.json(healthMap);
  } catch (error) {
    console.error('Station health error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station health' },
      { status: 500 }
    );
  }
}
