import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getPipelineMetrics,
  getJournalistWorkload,
  getSubEditorWorkload,
  getReviewQueueDetails,
  getApprovalQueueDetails,
  getWorkflowHealth,
  getTimeSensitiveStories,
} from '@/lib/editorial-metrics';

/**
 * GET /api/newsroom/dashboard/editorial-metrics
 * Get comprehensive editorial dashboard metrics
 *
 * Access: SUB_EDITOR, EDITOR, ADMIN, SUPERADMIN only
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check authorization - only sub-editors and above
    if (
      !session?.user ||
      session.user.userType !== 'STAFF' ||
      !['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole || '')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all metrics in parallel
    const [
      pipelineMetrics,
      journalistWorkload,
      subEditorWorkload,
      reviewQueue,
      approvalQueue,
      workflowHealth,
      timeSensitiveStories,
    ] = await Promise.all([
      getPipelineMetrics(),
      getJournalistWorkload(),
      getSubEditorWorkload(),
      getReviewQueueDetails(),
      getApprovalQueueDetails(),
      getWorkflowHealth(),
      getTimeSensitiveStories(),
    ]);

    return NextResponse.json({
      pipelineMetrics,
      reviewerWorkload: {
        journalists: journalistWorkload,
        subEditors: subEditorWorkload,
      },
      queues: {
        review: reviewQueue,
        approval: approvalQueue,
      },
      workflowHealth,
      timeSensitiveStories,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Editorial metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch editorial metrics' },
      { status: 500 }
    );
  }
}
