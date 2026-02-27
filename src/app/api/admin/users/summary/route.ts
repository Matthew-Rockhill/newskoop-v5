import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';

/**
 * GET /api/admin/users/summary
 * Returns aggregate user statistics for the admin user list
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

    const sevenDaysAgo = subDays(new Date(), 7);

    const [totalUsers, activeIn7Days, neverLoggedIn, pendingPassword] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.user.count({
        where: {
          lastLoginAt: null,
        },
      }),
      prisma.user.count({
        where: {
          mustChangePassword: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      activeIn7Days,
      neverLoggedIn,
      pendingPassword,
    });
  } catch (error) {
    console.error('User summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user summary' },
      { status: 500 }
    );
  }
}
