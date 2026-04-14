import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishBulletinEvent, createEvent } from '@/lib/ably';

/**
 * GET /api/cron/auto-publish-bulletins
 * Cron job that auto-publishes SCHEDULED bulletins 40 minutes before their on-air time.
 *
 * Runs every 10 minutes via vercel.json cron config.
 * Checks for bulletins where:
 *   - status is SCHEDULED
 *   - scheduledFor (on-air time) minus 40 minutes is in the past (i.e., it's time to publish)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find SCHEDULED bulletins whose on-air time is within the next 40 minutes (or already past)
    // i.e., scheduledFor - 40min <= now, meaning scheduledFor <= now + 40min
    const publishCutoff = new Date(now.getTime() + 40 * 60 * 1000);

    const bulletinsToPublish = await prisma.bulletin.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: {
          not: null,
          lte: publishCutoff,
        },
      },
      select: {
        id: true,
        title: true,
        scheduledFor: true,
      },
    });

    if (bulletinsToPublish.length === 0) {
      return NextResponse.json({
        success: true,
        published: 0,
        timestamp: now.toISOString(),
      });
    }

    // Publish each bulletin
    const results = await Promise.allSettled(
      bulletinsToPublish.map(async (bulletin) => {
        await prisma.bulletin.update({
          where: { id: bulletin.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        // Create audit log for auto-publish
        await prisma.auditLog.create({
          data: {
            userId: 'SYSTEM',
            action: 'AUTO_PUBLISH_BULLETIN',
            entityType: 'BULLETIN',
            entityId: bulletin.id,
            metadata: {
              title: bulletin.title,
              scheduledFor: bulletin.scheduledFor?.toISOString(),
              autoPublishedAt: new Date().toISOString(),
            },
          },
        });

        // Publish real-time event (non-blocking)
        publishBulletinEvent(
          createEvent('bulletin:status_changed', 'bulletin', bulletin.id, 'SYSTEM', undefined, {
            previousStatus: 'SCHEDULED',
            newStatus: 'PUBLISHED',
            autoPublished: true,
          })
        ).catch(() => {});

        return bulletin.id;
      })
    );

    const published = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed > 0) {
      console.error(
        'Some bulletins failed to auto-publish:',
        results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map((r) => r.reason)
      );
    }

    console.log(`Auto-publish: ${published} bulletins published, ${failed} failed`);

    return NextResponse.json({
      success: true,
      published,
      failed,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Auto-publish bulletins error:', error);
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
