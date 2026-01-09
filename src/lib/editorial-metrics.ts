import { prisma } from '@/lib/prisma';
import { StoryStage } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface StageMetrics {
  stage: StoryStage;
  count: number;
  oldestStoryId: string | null;
  oldestStoryTitle: string | null;
  oldestStoryDays: number | null;
  averageDaysInStage: number;
  storiesExceedingSLA: number;
}

export interface ReviewerWorkload {
  userId: string;
  name: string;
  email: string;
  storiesAssigned: number;
  oldestAssignedDays: number | null;
  role: string;
}

export interface StoryQueueItem {
  id: string;
  title: string;
  slug: string;
  stage: StoryStage | null;
  authorId: string;
  authorName: string;
  assignedToId: string | null;
  assignedToName: string | null;
  daysInStage: number;
  lastModified: Date;
  category: string | null;
  language: string;
}

export interface WorkflowHealth {
  totalInPipeline: number;
  publishedToday: number;
  publishedThisWeek: number;
  averageThroughput: number; // stories per day
  bottleneckStage: StoryStage | null;
  bottleneckCount: number;
}

// ============================================================================
// SLA THRESHOLDS (configurable)
// ============================================================================

export const SLA_THRESHOLDS: Record<StoryStage, number> = {
  DRAFT: 7, // 7 days in draft before it's considered stale
  NEEDS_JOURNALIST_REVIEW: 2, // 2 days for tier 1 review
  NEEDS_SUB_EDITOR_APPROVAL: 2, // 2 days for tier 2 approval
  APPROVED: 7, // 7 days between approval and translation
  TRANSLATED: 1, // 1 day to publish after translation
  PUBLISHED: 999, // Not applicable
};

// ============================================================================
// PIPELINE METRICS
// ============================================================================

/**
 * Get metrics for each stage in the workflow pipeline
 * Optimized: Single query instead of N+1 (one per stage)
 */
export async function getPipelineMetrics(): Promise<StageMetrics[]> {
  const stages: StoryStage[] = [
    'DRAFT',
    'NEEDS_JOURNALIST_REVIEW',
    'NEEDS_SUB_EDITOR_APPROVAL',
    'APPROVED',
    'TRANSLATED',
  ];

  // Single query to get all stories in pipeline stages
  const allStories = await prisma.story.findMany({
    where: {
      stage: { in: stages },
      isTranslation: false,
    },
    select: {
      id: true,
      title: true,
      stage: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: {
      updatedAt: 'asc',
    },
  });

  const now = new Date();

  // Group stories by stage and calculate metrics in memory
  const metrics = stages.map((stage) => {
    const stageStories = allStories.filter((s) => s.stage === stage);
    const count = stageStories.length;

    // Calculate days in stage for each story
    const daysInStage = stageStories.map((story) => {
      const stageEntry = story.updatedAt || story.createdAt;
      const diffMs = now.getTime() - stageEntry.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    });

    // Find oldest story (already sorted by updatedAt asc)
    const oldestStory = stageStories[0] || null;
    const oldestDays = daysInStage[0] || null;

    // Calculate average
    const averageDays =
      daysInStage.length > 0
        ? daysInStage.reduce((sum, days) => sum + days, 0) / daysInStage.length
        : 0;

    // Count stories exceeding SLA
    const slaThreshold = SLA_THRESHOLDS[stage];
    const exceedingSLA = daysInStage.filter((days) => days > slaThreshold).length;

    return {
      stage,
      count,
      oldestStoryId: oldestStory?.id || null,
      oldestStoryTitle: oldestStory?.title || null,
      oldestStoryDays: oldestDays,
      averageDaysInStage: Math.round(averageDays * 10) / 10,
      storiesExceedingSLA: exceedingSLA,
    };
  });

  return metrics;
}

// ============================================================================
// REVIEWER WORKLOAD
// ============================================================================

/**
 * Get workload distribution for journalists (tier 1 reviewers)
 * Optimized: 2 queries instead of N+1 (one per journalist)
 */
export async function getJournalistWorkload(): Promise<ReviewerWorkload[]> {
  // Parallel fetch: journalists and their assigned stories
  const [journalists, assignedStories] = await Promise.all([
    prisma.user.findMany({
      where: {
        userType: 'STAFF',
        staffRole: 'JOURNALIST',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
    prisma.story.findMany({
      where: {
        stage: 'NEEDS_JOURNALIST_REVIEW',
        assignedReviewerId: { not: null },
      },
      select: {
        id: true,
        assignedReviewerId: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
    }),
  ]);

  const now = new Date();

  // Group stories by reviewer in memory
  const storiesByReviewer = new Map<string, typeof assignedStories>();
  for (const story of assignedStories) {
    if (story.assignedReviewerId) {
      const existing = storiesByReviewer.get(story.assignedReviewerId) || [];
      existing.push(story);
      storiesByReviewer.set(story.assignedReviewerId, existing);
    }
  }

  const workload = journalists.map((journalist) => {
    const stories = storiesByReviewer.get(journalist.id) || [];
    const count = stories.length;

    // Calculate oldest assigned story
    let oldestDays: number | null = null;
    if (stories.length > 0) {
      const oldest = stories[0]; // Already sorted by updatedAt asc
      const stageEntry = oldest.updatedAt || oldest.createdAt;
      const diffMs = now.getTime() - stageEntry.getTime();
      oldestDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      userId: journalist.id,
      name: `${journalist.firstName} ${journalist.lastName}`,
      email: journalist.email,
      storiesAssigned: count,
      oldestAssignedDays: oldestDays,
      role: 'JOURNALIST',
    };
  });

  return workload.sort((a, b) => b.storiesAssigned - a.storiesAssigned);
}

/**
 * Get workload distribution for sub-editors (tier 2 approvers)
 * Optimized: 2 queries instead of N+1 (one per sub-editor)
 */
export async function getSubEditorWorkload(): Promise<ReviewerWorkload[]> {
  // Parallel fetch: sub-editors and their assigned stories
  const [subEditors, assignedStories] = await Promise.all([
    prisma.user.findMany({
      where: {
        userType: 'STAFF',
        staffRole: {
          in: ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        staffRole: true,
      },
    }),
    prisma.story.findMany({
      where: {
        stage: 'NEEDS_SUB_EDITOR_APPROVAL',
        assignedApproverId: { not: null },
      },
      select: {
        id: true,
        assignedApproverId: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
    }),
  ]);

  const now = new Date();

  // Group stories by approver in memory
  const storiesByApprover = new Map<string, typeof assignedStories>();
  for (const story of assignedStories) {
    if (story.assignedApproverId) {
      const existing = storiesByApprover.get(story.assignedApproverId) || [];
      existing.push(story);
      storiesByApprover.set(story.assignedApproverId, existing);
    }
  }

  const workload = subEditors.map((editor) => {
    const stories = storiesByApprover.get(editor.id) || [];
    const count = stories.length;

    // Calculate oldest assigned story
    let oldestDays: number | null = null;
    if (stories.length > 0) {
      const oldest = stories[0]; // Already sorted by updatedAt asc
      const stageEntry = oldest.updatedAt || oldest.createdAt;
      const diffMs = now.getTime() - stageEntry.getTime();
      oldestDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      userId: editor.id,
      name: `${editor.firstName} ${editor.lastName}`,
      email: editor.email,
      storiesAssigned: count,
      oldestAssignedDays: oldestDays,
      role: editor.staffRole || 'SUB_EDITOR',
    };
  });

  return workload.sort((a, b) => b.storiesAssigned - a.storiesAssigned);
}

// ============================================================================
// QUEUE DETAILS
// ============================================================================

/**
 * Get detailed list of stories in journalist review queue
 */
export async function getReviewQueueDetails(): Promise<StoryQueueItem[]> {
  const stories = await prisma.story.findMany({
    where: {
      stage: 'NEEDS_JOURNALIST_REVIEW',
    },
    select: {
      id: true,
      title: true,
      slug: true,
      stage: true,
      updatedAt: true,
      createdAt: true,
      language: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      assignedReviewer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'asc', // Oldest first
    },
  });

  const now = new Date();

  return stories.map((story) => {
    const stageEntry = story.updatedAt || story.createdAt;
    const diffMs = now.getTime() - stageEntry.getTime();
    const daysInStage = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      id: story.id,
      title: story.title,
      slug: story.slug,
      stage: story.stage,
      authorId: story.author.id,
      authorName: `${story.author.firstName} ${story.author.lastName}`,
      assignedToId: story.assignedReviewer?.id || null,
      assignedToName: story.assignedReviewer
        ? `${story.assignedReviewer.firstName} ${story.assignedReviewer.lastName}`
        : null,
      daysInStage,
      lastModified: story.updatedAt,
      category: story.category?.name || null,
      language: story.language,
    };
  });
}

/**
 * Get detailed list of stories in approval queue
 */
export async function getApprovalQueueDetails(): Promise<StoryQueueItem[]> {
  const stories = await prisma.story.findMany({
    where: {
      stage: 'NEEDS_SUB_EDITOR_APPROVAL',
    },
    select: {
      id: true,
      title: true,
      slug: true,
      stage: true,
      updatedAt: true,
      createdAt: true,
      language: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      assignedApprover: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'asc', // Oldest first
    },
  });

  const now = new Date();

  return stories.map((story) => {
    const stageEntry = story.updatedAt || story.createdAt;
    const diffMs = now.getTime() - stageEntry.getTime();
    const daysInStage = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      id: story.id,
      title: story.title,
      slug: story.slug,
      stage: story.stage,
      authorId: story.author.id,
      authorName: `${story.author.firstName} ${story.author.lastName}`,
      assignedToId: story.assignedApprover?.id || null,
      assignedToName: story.assignedApprover
        ? `${story.assignedApprover.firstName} ${story.assignedApprover.lastName}`
        : null,
      daysInStage,
      lastModified: story.updatedAt,
      category: story.category?.name || null,
      language: story.language,
    };
  });
}

// ============================================================================
// WORKFLOW HEALTH
// ============================================================================

/**
 * Get overall workflow health metrics
 * Optimized: Parallel queries instead of sequential
 */
export async function getWorkflowHealth(): Promise<WorkflowHealth> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Run all queries in parallel
  const [totalInPipeline, publishedToday, publishedThisWeek, publishedLast30Days, stageCounts] =
    await Promise.all([
      // Total stories in pipeline (not published)
      prisma.story.count({
        where: {
          stage: { not: 'PUBLISHED' },
          isTranslation: false,
        },
      }),
      // Stories published today
      prisma.story.count({
        where: {
          stage: 'PUBLISHED',
          publishedAt: { gte: todayStart },
        },
      }),
      // Stories published this week
      prisma.story.count({
        where: {
          stage: 'PUBLISHED',
          publishedAt: { gte: weekStart },
        },
      }),
      // Stories published in last 30 days
      prisma.story.count({
        where: {
          stage: 'PUBLISHED',
          publishedAt: { gte: thirtyDaysAgo },
        },
      }),
      // Find bottleneck stage (most stories)
      prisma.story.groupBy({
        by: ['stage'],
        where: {
          stage: { not: 'PUBLISHED' },
          isTranslation: false,
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

  const averageThroughput = publishedLast30Days / 30;
  const bottleneck = stageCounts[0] || null;

  return {
    totalInPipeline,
    publishedToday,
    publishedThisWeek,
    averageThroughput: Math.round(averageThroughput * 10) / 10,
    bottleneckStage: bottleneck?.stage || null,
    bottleneckCount: bottleneck?._count.id || 0,
  };
}

// ============================================================================
// TIME-SENSITIVE CONTENT
// ============================================================================

export interface TimeSensitiveStory {
  id: string;
  title: string;
  slug: string;
  stage: StoryStage | null;
  authorName: string;
  followUpDate: Date | null;
  scheduledPublishAt: Date | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
}

/**
 * Get stories with approaching or overdue follow-up dates and scheduled publishes
 */
export async function getTimeSensitiveStories(): Promise<TimeSensitiveStory[]> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const stories = await prisma.story.findMany({
    where: {
      stage: {
        not: 'PUBLISHED',
      },
      OR: [
        {
          followUpDate: {
            lte: sevenDaysFromNow,
          },
        },
        {
          scheduledPublishAt: {
            lte: sevenDaysFromNow,
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      stage: true,
      followUpDate: true,
      scheduledPublishAt: true,
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [
      { followUpDate: 'asc' },
      { scheduledPublishAt: 'asc' },
    ],
  });

  return stories.map((story) => {
    const dueDate = story.followUpDate || story.scheduledPublishAt;
    let daysUntilDue: number | null = null;
    let isOverdue = false;

    if (dueDate) {
      const diffMs = dueDate.getTime() - now.getTime();
      daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isOverdue = daysUntilDue < 0;
    }

    return {
      id: story.id,
      title: story.title,
      slug: story.slug,
      stage: story.stage,
      authorName: `${story.author.firstName} ${story.author.lastName}`,
      followUpDate: story.followUpDate,
      scheduledPublishAt: story.scheduledPublishAt,
      daysUntilDue,
      isOverdue,
    };
  });
}
