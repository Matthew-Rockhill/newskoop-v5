import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/super/active-users
 * Get users who have logged in recently
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

    // Get users with recent login activity
    const activeUsers = await prisma.user.findMany({
      where: {
        lastLoginAt: {
          gte: cutoffDate,
        },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userType: true,
        staffRole: true,
        lastLoginAt: true,
      },
      orderBy: {
        lastLoginAt: 'desc',
      },
    });

    // Calculate counts by user type
    const staffUsers = activeUsers.filter((u) => u.userType === 'STAFF');
    const radioUsers = activeUsers.filter((u) => u.userType === 'RADIO');

    return NextResponse.json({
      total: activeUsers.length,
      staff: staffUsers.length,
      radio: radioUsers.length,
      users: activeUsers.map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType,
        staffRole: user.staffRole,
        lastLoginAt: user.lastLoginAt,
      })),
    });
  } catch (error) {
    console.error('Active users fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active users' },
      { status: 500 }
    );
  }
}
