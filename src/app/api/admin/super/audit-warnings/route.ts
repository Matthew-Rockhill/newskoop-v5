import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/super/audit-warnings
 * Get failed login attempts and other audit warnings
 * SUPERADMIN only
 *
 * Query params:
 * - hours: number of hours to look back (default: 24)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication and authorization
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPERADMIN can access
    if (session.user.staffRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const hoursParam = url.searchParams.get('hours');
    const hours = hoursParam ? parseInt(hoursParam, 10) : 24;

    if (isNaN(hours) || hours < 1 || hours > 720) {
      return NextResponse.json(
        { error: 'Invalid hours parameter (must be 1-720)' },
        { status: 400 }
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    // Get failed login attempts and other warnings from audit log
    const warningActions = [
      'auth.login.failed',
      'auth.login.invalid_credentials',
      'auth.login.inactive_account',
      'auth.password_reset.failed',
    ];

    const auditEvents = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: cutoffDate,
        },
        action: {
          in: warningActions,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to most recent 100 events
    });

    // Count failed logins specifically
    const failedLogins = auditEvents.filter(
      (e) =>
        e.action === 'auth.login.failed' ||
        e.action === 'auth.login.invalid_credentials'
    ).length;

    return NextResponse.json({
      failedLogins,
      totalWarnings: auditEvents.length,
      events: auditEvents.map((event) => ({
        id: event.id,
        action: event.action,
        ipAddress: event.ipAddress,
        createdAt: event.createdAt,
        user: event.user
          ? {
              name: `${event.user.firstName} ${event.user.lastName}`,
              email: event.user.email,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('Audit warnings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit warnings' },
      { status: 500 }
    );
  }
}
