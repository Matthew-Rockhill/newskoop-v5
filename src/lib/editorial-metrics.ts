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
 */
export async function getPipelineMetrics(): Promise<StageMetrics[]> {
  const stages: StoryStage[] = [
    'DRAFT',
    'NEEDS_JOURNALIST_REVIEW',
    'NEEDS_SUB_EDITOR_APPROVAL',
    'APPROVED',
    'TRANSLATED',
  ];

  const metrics = await Promise.all(
    stages.map(async (stage) => {
      // Get all stories in this stage
      const stories = await prisma.story.findMany({
        where: {
          stage,
          isTranslation: false, // Exclude translations from main pipeline
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: {
          updatedAt: 'asc', // Oldest first
        },
      });

      const count = stories.length;
      const now = new Date();

      // Calculate days in stage for each story
      const daysInStage = stories.map((story) => {
        const stageEntry = story.updatedAt || story.createdAt;
        const diffMs = now.getTime() - stageEntry.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      });

      // Find oldest story
      const oldestStory = stories[0] || null;
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
    })
  );

  return metrics;
}

// ============================================================================
// REVIEWER WORKLOAD
// ============================================================================

/**
 * Get workload distribution for journalists (tier 1 reviewers)
 */
export async function getJournalistWorkload(): Promise<ReviewerWorkload[]> {
  // Get all journalists
  const journalists = await prisma.user.findMany({
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
  });

  const workload = await Promise.all(
    journalists.map(async (journalist) => {
      // Get stories assigned for review
      const assignedStories = await prisma.story.findMany({
        where: {
          stage: 'NEEDS_JOURNALIST_REVIEW',
          assignedReviewerId: journalist.id,
        },
        select: {
          id: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });

      const count = assignedStories.length;
      const now = new Date();

      // Calculate oldest assigned story
      let oldestDays: number | null = null;
      if (assignedStories.length > 0) {
        const oldest = assignedStories[0];
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
    })
  );

  return workload.sort((a, b) => b.storiesAssigned - a.storiesAssigned);
}

/**
 * Get workload distribution for sub-editors (tier 2 approvers)
 */
export async function getSubEditorWorkload(): Promise<ReviewerWorkload[]> {
  // Get all sub-editors
  const subEditors = await prisma.user.findMany({
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
  });

  const workload = await Promise.all(
    subEditors.map(async (editor) => {
      // Get stories assigned for approval
      const assignedStories = await prisma.story.findMany({
        where: {
          stage: 'NEEDS_SUB_EDITOR_APPROVAL',
          assignedApproverId: editor.id,
        },
        select: {
          id: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });

      const count = assignedStories.length;
      const now = new Date();

      // Calculate oldest assigned story
      let oldestDays: number | null = null;
      if (assignedStories.length > 0) {
        const oldest = assignedStories[0];
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
    })
  );

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
 */
export async function getWorkflowHealth(): Promise<WorkflowHealth> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // Total stories in pipeline (not published)
  const totalInPipeline = await prisma.story.count({
    where: {
      stage: {
        not: 'PUBLISHED',
      },
      isTranslation: false,
    },
  });

  // Stories published today
  const publishedToday = await prisma.story.count({
    where: {
      stage: 'PUBLISHED',
      publishedAt: {
        gte: todayStart,
      },
    },
  });

  // Stories published this week
  const publishedThisWeek = await prisma.story.count({
    where: {
      stage: 'PUBLISHED',
      publishedAt: {
        gte: weekStart,
      },
    },
  });

  // Calculate average throughput (stories per day over last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const publishedLast30Days = await prisma.story.count({
    where: {
      stage: 'PUBLISHED',
      publishedAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  const averageThroughput = publishedLast30Days / 30;

  // Find bottleneck stage (most stories)
  const stageCounts = await prisma.story.groupBy({
    by: ['stage'],
    where: {
      stage: {
        not: 'PUBLISHED',
      },
      isTranslation: false,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  });

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
