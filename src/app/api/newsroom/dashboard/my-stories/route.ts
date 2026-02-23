import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { Prisma } from '@prisma/client';

const DASHBOARD_STORY_SELECT = {
  id: true,
  title: true,
  updatedAt: true,
  language: true,
  author: {
    select: { firstName: true, lastName: true },
  },
  assignedReviewer: {
    select: { firstName: true, lastName: true },
  },
  assignedApprover: {
    select: { firstName: true, lastName: true },
  },
  _count: {
    select: { audioClips: true },
  },
} satisfies Prisma.StorySelect;

const PER_PAGE = 20;

/**
 * GET /api/newsroom/dashboard/my-stories
 * Returns all story buckets for the authenticated user's dashboard in a single request.
 * Replaces 9 separate /api/newsroom/stories calls.
 */
const getMyStories = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; userType: string; staffRole: string | null } }).user;

    if (user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = user.id;

    // Run all 9 queries in parallel with minimal select
    const [
      drafts,
      needsReview,
      needsApproval,
      approved,
      published,
      reviewTasks,
      approvalTasks,
      translationTasks,
      publishingTasks,
    ] = await Promise.all([
      // My Work: drafts I authored
      prisma.story.findMany({
        where: { authorId: userId, stage: 'DRAFT' },
        select: DASHBOARD_STORY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: PER_PAGE,
      }),
      // My Work: stories I authored in journalist review
      prisma.story.findMany({
        where: { authorId: userId, stage: 'NEEDS_JOURNALIST_REVIEW' },
        select: DASHBOARD_STORY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: PER_PAGE,
      }),
      // My Work: stories I authored pending sub-editor approval
      prisma.story.findMany({
        where: { authorId: userId, stage: 'NEEDS_SUB_EDITOR_APPROVAL' },
        select: DASHBOARD_STORY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: PER_PAGE,
      }),
      // My Work: stories I authored that are approved
      prisma.story.findMany({
        where: { authorId: userId, stage: 'APPROVED' },
        select: DASHBOARD_STORY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: PER_PAGE,
      }),
      // My Work: stories I authored that are published
      prisma.story.findMany({
        where: { authorId: userId, stage: 'PUBLISHED' },
        select: DASHBOARD_STORY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: PER_PAGE,
      }),
      // Tasks: stories assigned to me for journalist review
      prisma.story.findMany({
        where: { assignedReviewerId: userId, stage: 'NEEDS_JOURNALIST_REVIEW' },
        select: DASHBOARD_STORY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: PER_PAGE,
      }),
      // Tasks: stories assigned to me for sub-editor approval
      prisma.story.findMany({
        where: { assignedApproverId: userId, stage: 'NEEDS_SUB_EDITOR_APPROVAL' },
        select: DASHBOARD_STORY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: PER_PAGE,
      }),
      // Tasks: translation drafts assigned to me
      prisma.story.findMany({
        where: { authorId: userId, isTranslation: true, stage: 'DRAFT' },
        select: DASHBOARD_STORY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: PER_PAGE,
      }),
      // Tasks: translated stories assigned to me for publishing
      prisma.story.findMany({
        where: { assignedApproverId: userId, stage: 'TRANSLATED' },
        select: DASHBOARD_STORY_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: PER_PAGE,
      }),
    ]);

    return NextResponse.json({
      myWork: {
        drafts,
        needsReview,
        needsApproval,
        approved,
        published,
      },
      tasks: {
        review: reviewTasks,
        approval: approvalTasks,
        translation: translationTasks,
        publishing: publishingTasks,
      },
    });
  },
  [withErrorHandling, withAuth]
);

export { getMyStories as GET };
