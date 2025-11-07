import { prisma } from '@/lib/prisma';
import { ContentType, PeriodType } from '@prisma/client';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Anonymize IP address (keep first 3 octets)
 * Example: "192.168.1.100" -> "192.168.1.0"
 */
function anonymizeIP(ip: string | null): string | null {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

export interface TrackViewParams {
  contentType: ContentType;
  contentId: string;
  userId?: string;
  stationId?: string;
  language?: string;
  category?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Track a content view event
 * This is async and catches errors to avoid impacting user experience
 */
export async function trackContentView(params: TrackViewParams): Promise<void> {
  try {
    await prisma.contentView.create({
      data: {
        contentType: params.contentType,
        contentId: params.contentId,
        userId: params.userId,
        stationId: params.stationId,
        language: params.language,
        category: params.category,
        ipAddress: anonymizeIP(params.ipAddress),
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    // Don't fail user experience if analytics fails
    console.error('Failed to track view:', error);
  }
}

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

export interface AnalyticsQuery {
  contentType?: ContentType;
  contentId?: string;
  stationId?: string;
  startDate: Date;
  endDate: Date;
  periodType?: PeriodType;
}

/**
 * Get analytics for specific content or date range
 * Uses pre-aggregated ContentAnalytics table for performance
 */
export async function getContentAnalytics(params: AnalyticsQuery) {
  const { contentType, contentId, stationId, startDate, endDate, periodType = 'DAILY' } = params;

  // Build where clause
  const where: any = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    periodType,
  };

  if (contentType) where.contentType = contentType;
  if (contentId) where.contentId = contentId;
  if (stationId) where.stationId = stationId;

  const analytics = await prisma.contentAnalytics.findMany({
    where,
    include: {
      station: {
        select: { id: true, name: true, province: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  return analytics;
}

/**
 * Get overview statistics for a date range
 */
export async function getOverviewStats(params: {
  startDate: Date;
  endDate: Date;
  stationId?: string;
}) {
  const { startDate, endDate, stationId } = params;

  const where: any = {
    viewedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (stationId) where.stationId = stationId;

  // Get total views
  const totalViews = await prisma.contentView.count({ where });

  // Get unique users
  const uniqueUsers = await prisma.contentView.findMany({
    where,
    select: { userId: true },
    distinct: ['userId'],
  });

  // Get active stations
  const activeStations = await prisma.contentView.findMany({
    where: {
      ...where,
      stationId: { not: null },
    },
    select: { stationId: true },
    distinct: ['stationId'],
  });

  // Calculate average views per day
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const avgViewsPerDay = daysDiff > 0 ? totalViews / daysDiff : 0;

  return {
    totalViews,
    uniqueUsers: uniqueUsers.length,
    activeStations: activeStations.length,
    avgViewsPerDay,
  };
}

/**
 * Get time-series data for charts
 * Groups views by date for trend visualization
 */
export async function getTimeSeriesData(params: {
  startDate: Date;
  endDate: Date;
  stationId?: string;
  contentType?: ContentType;
}) {
  const { startDate, endDate, stationId, contentType } = params;

  const where: any = {
    viewedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (stationId) where.stationId = stationId;
  if (contentType) where.contentType = contentType;

  // Group by date (day)
  const views = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
    SELECT
      DATE_TRUNC('day', "viewedAt") as date,
      COUNT(*)::int as count
    FROM "ContentView"
    WHERE "viewedAt" >= ${startDate}
      AND "viewedAt" <= ${endDate}
      ${stationId ? prisma.$queryRawUnsafe`AND "stationId" = '${stationId}'` : prisma.$queryRawUnsafe``}
      ${contentType ? prisma.$queryRawUnsafe`AND "contentType" = '${contentType}'` : prisma.$queryRawUnsafe``}
    GROUP BY DATE_TRUNC('day', "viewedAt")
    ORDER BY date ASC
  `;

  return views.map(v => ({
    date: v.date,
    views: Number(v.count),
  }));
}

// ============================================================================
// TOP CONTENT QUERIES
// ============================================================================

export interface TopContentParams {
  contentType?: ContentType;
  stationId?: string;
  startDate: Date;
  endDate: Date;
  limit?: number;
}

/**
 * Get top viewed content
 * Returns enriched content with metadata
 */
export async function getTopContent(params: TopContentParams) {
  const { contentType, stationId, startDate, endDate, limit = 10 } = params;

  const where: any = {
    viewedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (contentType) where.contentType = contentType;
  if (stationId) where.stationId = stationId;

  // Group by content and count views
  const topContent = await prisma.contentView.groupBy({
    by: ['contentType', 'contentId'],
    where,
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });

  // Fetch content details
  const enrichedContent = await Promise.all(
    topContent.map(async (item) => {
      let content = null;

      if (item.contentType === 'STORY' || item.contentType === 'BULLETIN') {
        content = await prisma.story.findUnique({
          where: { id: item.contentId },
          select: {
            id: true,
            title: true,
            slug: true,
            category: { select: { name: true } },
            language: true,
          },
        });
      } else if (item.contentType === 'SHOW') {
        content = await prisma.show.findUnique({
          where: { id: item.contentId },
          select: {
            id: true,
            title: true,
            slug: true,
            category: { select: { name: true } },
          },
        });
      } else if (item.contentType === 'EPISODE') {
        content = await prisma.episode.findUnique({
          where: { id: item.contentId },
          select: {
            id: true,
            title: true,
            slug: true,
            show: {
              select: { title: true },
            },
          },
        });
      }

      return {
        contentType: item.contentType,
        contentId: item.contentId,
        content,
        views: item._count.id,
      };
    })
  );

  // Filter out deleted content
  return enrichedContent.filter(item => item.content !== null);
}

// ============================================================================
// STATION ACTIVITY
// ============================================================================

/**
 * Get station activity summary
 * Shows which stations are most active
 */
export async function getStationActivity(params: {
  startDate: Date;
  endDate: Date;
  limit?: number;
}) {
  const { startDate, endDate, limit = 10 } = params;

  const stationActivity = await prisma.contentView.groupBy({
    by: ['stationId'],
    where: {
      viewedAt: {
        gte: startDate,
        lte: endDate,
      },
      stationId: { not: null },
    },
    _count: {
      id: true,
      userId: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });

  // Fetch station details
  const enrichedActivity = await Promise.all(
    stationActivity.map(async (item) => {
      const station = await prisma.station.findUnique({
        where: { id: item.stationId! },
        select: {
          id: true,
          name: true,
          province: true,
          contactEmail: true,
        },
      });

      // Get unique users for this station
      const uniqueUsers = await prisma.contentView.findMany({
        where: {
          stationId: item.stationId,
          viewedAt: {
            gte: startDate,
            lte: endDate,
          },
          userId: { not: null },
        },
        select: { userId: true },
        distinct: ['userId'],
      });

      return {
        station,
        views: item._count.id,
        uniqueUsers: uniqueUsers.length,
      };
    })
  );

  // Filter out deleted stations
  return enrichedActivity.filter(item => item.station !== null);
}

// ============================================================================
// CONTENT-SPECIFIC ANALYTICS
// ============================================================================

/**
 * Get analytics for a specific piece of content
 * Useful for "story insights" page
 */
export async function getContentInsights(params: {
  contentType: ContentType;
  contentId: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { contentType, contentId, startDate, endDate } = params;

  const where: any = {
    contentType,
    contentId,
  };

  if (startDate && endDate) {
    where.viewedAt = {
      gte: startDate,
      lte: endDate,
    };
  }

  // Total views
  const totalViews = await prisma.contentView.count({ where });

  // Unique users
  const uniqueUsers = await prisma.contentView.findMany({
    where,
    select: { userId: true },
    distinct: ['userId'],
  });

  // Views by station
  const viewsByStation = await prisma.contentView.groupBy({
    by: ['stationId'],
    where: {
      ...where,
      stationId: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  // Views by language
  const viewsByLanguage = await prisma.contentView.groupBy({
    by: ['language'],
    where: {
      ...where,
      language: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  // Time series (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const timeSeries = await getTimeSeriesData({
    startDate: startDate || thirtyDaysAgo,
    endDate: endDate || new Date(),
    contentType,
  });

  return {
    totalViews,
    uniqueUsers: uniqueUsers.length,
    viewsByStation,
    viewsByLanguage,
    timeSeries,
  };
}

// ============================================================================
// AGGREGATION FUNCTIONS (for cron jobs)
// ============================================================================

/**
 * Aggregate views into daily buckets
 * Should be run daily via cron
 */
export async function aggregateDailyViews(date: Date) {
  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);

  const endOfDate = new Date(date);
  endOfDate.setHours(23, 59, 59, 999);

  console.log(`Aggregating daily views for ${date.toISOString().split('T')[0]}`);

  // Get all views for the day
  const views = await prisma.contentView.findMany({
    where: {
      viewedAt: {
        gte: startOfDate,
        lte: endOfDate,
      },
    },
    select: {
      contentType: true,
      contentId: true,
      stationId: true,
      userId: true,
      language: true,
    },
  });

  if (views.length === 0) {
    console.log('No views to aggregate');
    return { aggregated: 0 };
  }

  // Group views by content and station
  const groupedViews = new Map<string, {
    contentType: ContentType;
    contentId: string;
    stationId: string | null;
    viewCount: number;
    uniqueUsers: Set<string>;
    languages: Map<string, number>;
  }>();

  for (const view of views) {
    const key = `${view.contentType}:${view.contentId}:${view.stationId || 'null'}`;

    if (!groupedViews.has(key)) {
      groupedViews.set(key, {
        contentType: view.contentType,
        contentId: view.contentId,
        stationId: view.stationId,
        viewCount: 0,
        uniqueUsers: new Set(),
        languages: new Map(),
      });
    }

    const group = groupedViews.get(key)!;
    group.viewCount++;

    if (view.userId) {
      group.uniqueUsers.add(view.userId);
    }

    if (view.language) {
      group.languages.set(view.language, (group.languages.get(view.language) || 0) + 1);
    }
  }

  // Upsert aggregated data
  let aggregatedCount = 0;

  for (const [, data] of groupedViews) {
    const topLanguages: Record<string, number> = {};
    data.languages.forEach((count, lang) => {
      topLanguages[lang] = count;
    });

    await prisma.contentAnalytics.upsert({
      where: {
        contentType_contentId_periodType_date_stationId: {
          contentType: data.contentType,
          contentId: data.contentId,
          periodType: 'DAILY',
          date: startOfDate,
          stationId: data.stationId,
        },
      },
      create: {
        contentType: data.contentType,
        contentId: data.contentId,
        stationId: data.stationId,
        periodType: 'DAILY',
        date: startOfDate,
        viewCount: data.viewCount,
        uniqueUsers: data.uniqueUsers.size,
        topLanguages: topLanguages,
      },
      update: {
        viewCount: data.viewCount,
        uniqueUsers: data.uniqueUsers.size,
        topLanguages: topLanguages,
      },
    });

    aggregatedCount++;
  }

  console.log(`Aggregated ${aggregatedCount} records for ${views.length} views`);

  return {
    aggregated: aggregatedCount,
    totalViews: views.length,
  };
}

/**
 * Archive old view records
 * Should be run monthly via cron
 * Deletes raw views older than retentionDays (default: 90 days)
 */
export async function archiveOldViews(retentionDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  console.log(`Archiving views older than ${cutoffDate.toISOString().split('T')[0]}`);

  const result = await prisma.contentView.deleteMany({
    where: {
      viewedAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`Archived ${result.count} old view records`);

  return {
    archived: result.count,
    cutoffDate,
  };
}
