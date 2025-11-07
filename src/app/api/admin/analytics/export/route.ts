import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stringify } from 'csv-stringify/sync';
import { ContentType } from '@prisma/client';

/**
 * GET /api/admin/analytics/export
 * Export analytics data as CSV
 *
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - contentType: optional filter by content type
 * - stationId: optional filter by station
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only STAFF users with ADMIN/SUPERADMIN role can access
    if (
      !session?.user ||
      session.user.userType !== 'STAFF' ||
      !['ADMIN', 'SUPERADMIN'].includes(session.user.staffRole || '')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const contentTypeParam = url.searchParams.get('contentType');
    const stationIdParam = url.searchParams.get('stationId');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    // Build where clause
    const where: any = {
      viewedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (contentTypeParam) {
      where.contentType = contentTypeParam as ContentType;
    }

    if (stationIdParam) {
      where.stationId = stationIdParam;
    }

    // Fetch view data with related information
    const views = await prisma.contentView.findMany({
      where,
      select: {
        id: true,
        contentType: true,
        contentId: true,
        viewedAt: true,
        language: true,
        category: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        station: {
          select: {
            id: true,
            name: true,
            province: true,
          },
        },
      },
      orderBy: {
        viewedAt: 'desc',
      },
      take: 10000, // Limit to prevent excessive data export
    });

    // Get content details for each view
    const enrichedViews = await Promise.all(
      views.map(async (view) => {
        let contentTitle = 'Unknown';
        let contentSlug = '';

        try {
          if (view.contentType === 'STORY' || view.contentType === 'BULLETIN') {
            const story = await prisma.story.findUnique({
              where: { id: view.contentId },
              select: { title: true, slug: true },
            });
            if (story) {
              contentTitle = story.title;
              contentSlug = story.slug;
            }
          } else if (view.contentType === 'SHOW') {
            const show = await prisma.show.findUnique({
              where: { id: view.contentId },
              select: { title: true, slug: true },
            });
            if (show) {
              contentTitle = show.title;
              contentSlug = show.slug;
            }
          } else if (view.contentType === 'EPISODE') {
            const episode = await prisma.episode.findUnique({
              where: { id: view.contentId },
              select: { title: true, slug: true },
            });
            if (episode) {
              contentTitle = episode.title;
              contentSlug = episode.slug;
            }
          }
        } catch (error) {
          console.error('Error fetching content details:', error);
        }

        return {
          'View ID': view.id,
          'Content Type': view.contentType,
          'Content ID': view.contentId,
          'Content Title': contentTitle,
          'Content Slug': contentSlug,
          'Viewed At': view.viewedAt.toISOString(),
          'Language': view.language || 'N/A',
          'Category': view.category || 'N/A',
          'User ID': view.user?.id || 'Anonymous',
          'User Name': view.user ? `${view.user.firstName} ${view.user.lastName}` : 'Anonymous',
          'User Email': view.user?.email || 'N/A',
          'Station ID': view.station?.id || 'N/A',
          'Station Name': view.station?.name || 'N/A',
          'Station Province': view.station?.province || 'N/A',
        };
      })
    );

    // Generate CSV
    const csv = stringify(enrichedViews, {
      header: true,
      columns: [
        'View ID',
        'Content Type',
        'Content ID',
        'Content Title',
        'Content Slug',
        'Viewed At',
        'Language',
        'Category',
        'User ID',
        'User Name',
        'User Email',
        'Station ID',
        'Station Name',
        'Station Province',
      ],
    });

    // Generate filename with date range
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const filename = `analytics-${startDateStr}-to-${endDateStr}.csv`;

    // Return CSV with appropriate headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    );
  }
}
