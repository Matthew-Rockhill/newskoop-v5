import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/super/system-health
 * Check database connectivity and system health
 * SUPERADMIN only
 */
export async function GET() {
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

    // Check database connectivity with timing
    const startTime = Date.now();
    let databaseConnected = false;
    let databaseError: string | undefined;

    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch (error) {
      databaseError = error instanceof Error ? error.message : 'Unknown database error';
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      database: {
        connected: databaseConnected,
        latencyMs,
        error: databaseError,
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('System health check error:', error);
    return NextResponse.json(
      { error: 'Failed to check system health' },
      { status: 500 }
    );
  }
}
