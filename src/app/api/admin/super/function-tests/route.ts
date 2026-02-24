import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface HealthCheck {
  name: string;
  category: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  latencyMs?: number;
}

interface HealthCheckResponse {
  checks: HealthCheck[];
  summary: { total: number; passed: number; warnings: number; failed: number };
  timestamp: string;
}

async function checkDatabaseConnectivity(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return {
      name: 'Database Connectivity',
      category: 'Infrastructure',
      status: latencyMs > 500 ? 'warn' : 'pass',
      message: latencyMs > 500 ? `Connected but slow (${latencyMs}ms)` : `Connected (${latencyMs}ms)`,
      latencyMs,
    };
  } catch {
    return {
      name: 'Database Connectivity',
      category: 'Infrastructure',
      status: 'fail',
      message: 'Cannot connect to database',
      latencyMs: Date.now() - start,
    };
  }
}

async function checkDatabaseData(): Promise<HealthCheck> {
  try {
    const [userCount, storyCount, categoryCount] = await Promise.all([
      prisma.user.count(),
      prisma.story.count(),
      prisma.category.count(),
    ]);
    const counts = { users: userCount, stories: storyCount, categories: categoryCount };
    const allPresent = userCount > 0 && storyCount > 0 && categoryCount > 0;
    const somePresent = userCount > 0 || storyCount > 0 || categoryCount > 0;

    return {
      name: 'Database Data',
      category: 'Infrastructure',
      status: allPresent ? 'pass' : somePresent ? 'warn' : 'warn',
      message: `${counts.users} users, ${counts.stories} stories, ${counts.categories} categories`,
    };
  } catch {
    return {
      name: 'Database Data',
      category: 'Infrastructure',
      status: 'fail',
      message: 'Failed to query data counts',
    };
  }
}

function checkEmailService(): HealthCheck {
  const hasKey = !!process.env.RESEND_API_KEY;
  const emailMode = process.env.EMAIL_MODE || 'unknown';

  if (!hasKey) {
    return {
      name: 'Email Service',
      category: 'Services',
      status: 'fail',
      message: 'RESEND_API_KEY not set',
    };
  }

  if (emailMode === 'console') {
    return {
      name: 'Email Service',
      category: 'Services',
      status: 'warn',
      message: `API key set, but mode is "${emailMode}" (emails log to console)`,
    };
  }

  return {
    name: 'Email Service',
    category: 'Services',
    status: 'pass',
    message: `API key set, mode: ${emailMode}`,
  };
}

function checkBlobStorage(): HealthCheck {
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  return {
    name: 'Blob Storage',
    category: 'Services',
    status: hasToken ? 'pass' : 'fail',
    message: hasToken ? 'BLOB_READ_WRITE_TOKEN set' : 'BLOB_READ_WRITE_TOKEN not set',
  };
}

function checkRealtime(): HealthCheck {
  const hasKey = !!process.env.ABLY_API_KEY;
  const enabled = process.env.ENABLE_REALTIME === 'true';

  if (!hasKey) {
    return {
      name: 'Real-time (Ably)',
      category: 'Services',
      status: 'fail',
      message: 'ABLY_API_KEY not set',
    };
  }

  if (!enabled) {
    return {
      name: 'Real-time (Ably)',
      category: 'Services',
      status: 'warn',
      message: 'API key set but ENABLE_REALTIME is not "true"',
    };
  }

  return {
    name: 'Real-time (Ably)',
    category: 'Services',
    status: 'pass',
    message: 'API key set and enabled',
  };
}

function checkAuthConfig(): HealthCheck {
  const hasSecret = !!process.env.NEXTAUTH_SECRET;
  const hasUrl = !!process.env.NEXTAUTH_URL;

  if (!hasSecret || !hasUrl) {
    const missing = [
      !hasSecret && 'NEXTAUTH_SECRET',
      !hasUrl && 'NEXTAUTH_URL',
    ].filter(Boolean);
    return {
      name: 'Auth Config',
      category: 'Configuration',
      status: 'fail',
      message: `Missing: ${missing.join(', ')}`,
    };
  }

  return {
    name: 'Auth Config',
    category: 'Configuration',
    status: 'pass',
    message: 'NEXTAUTH_SECRET and NEXTAUTH_URL set',
  };
}

async function checkSeedData(): Promise<HealthCheck> {
  try {
    const [languageCount, religionCount, localityCount, categoryCount] = await Promise.all([
      prisma.classification.count({ where: { type: 'LANGUAGE' } }),
      prisma.classification.count({ where: { type: 'RELIGION' } }),
      prisma.classification.count({ where: { type: 'LOCALITY' } }),
      prisma.category.count(),
    ]);

    const types = [
      languageCount > 0 && 'languages',
      religionCount > 0 && 'religions',
      localityCount > 0 && 'localities',
    ].filter(Boolean);

    const allPresent = languageCount > 0 && religionCount > 0 && localityCount > 0 && categoryCount > 0;
    const noneFound = languageCount === 0 && religionCount === 0 && localityCount === 0 && categoryCount === 0;

    if (noneFound) {
      return {
        name: 'Seed Data',
        category: 'Configuration',
        status: 'fail',
        message: 'No categories or classifications found',
      };
    }

    return {
      name: 'Seed Data',
      category: 'Configuration',
      status: allPresent ? 'pass' : 'warn',
      message: `${categoryCount} categories, ${types.length}/3 classification types (${types.join(', ')})`,
    };
  } catch {
    return {
      name: 'Seed Data',
      category: 'Configuration',
      status: 'fail',
      message: 'Failed to query seed data',
    };
  }
}

/**
 * POST /api/admin/super/function-tests
 * Run live health checks against production services
 * SUPERADMIN only
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.staffRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results = await Promise.allSettled([
      checkDatabaseConnectivity(),
      checkDatabaseData(),
      Promise.resolve(checkEmailService()),
      Promise.resolve(checkBlobStorage()),
      Promise.resolve(checkRealtime()),
      Promise.resolve(checkAuthConfig()),
      checkSeedData(),
    ]);

    const checks: HealthCheck[] = results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      // If a check itself threw, report it as failed
      const names = [
        'Database Connectivity', 'Database Data', 'Email Service',
        'Blob Storage', 'Real-time (Ably)', 'Auth Config', 'Seed Data',
      ];
      return {
        name: names[idx],
        category: 'Unknown',
        status: 'fail' as const,
        message: 'Check threw an unexpected error',
      };
    });

    const summary = {
      total: checks.length,
      passed: checks.filter((c) => c.status === 'pass').length,
      warnings: checks.filter((c) => c.status === 'warn').length,
      failed: checks.filter((c) => c.status === 'fail').length,
    };

    const response: HealthCheckResponse = {
      checks,
      summary,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run health checks' },
      { status: 500 }
    );
  }
}
