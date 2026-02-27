import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuditLogs } from '@/lib/audit';

/**
 * GET /api/admin/users/[id]/activity
 * Get audit log entries for a specific user
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: userId } = await params;
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const action = url.searchParams.get('action') || undefined;

    const result = await getAuditLogs({
      userId,
      action,
      page,
      perPage: 20,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('User activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}
