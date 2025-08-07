import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { z } from 'zod';

// Schema for review checklist update
const reviewChecklistSchema = z.object({
  storyStructure: z.boolean(),
  languageGrammar: z.boolean(),
  factChecking: z.boolean(),
  audioQuality: z.boolean(),
});

// PATCH /api/newsroom/stories/[id]/review-checklist - Update review checklist
const updateReviewChecklist = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    
    // Only journalists can update the review checklist
    if (user.staffRole !== 'JOURNALIST') {
      return NextResponse.json({ error: 'Only journalists can update review checklist' }, { status: 403 });
    }
    
    const body = await req.json();
    
    // Validate the checklist data
    const checklist = reviewChecklistSchema.parse(body);
    
    // Get the story to check permissions
    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        reviewerId: true,
        authorId: true,
      },
    });
    
    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    
    // Check if journalist is authorized to review this story
    const isReviewer = story.reviewerId === user.id;
    const isAuthor = story.authorId === user.id;
    
    if (!isReviewer && !isAuthor) {
      return NextResponse.json({ error: 'Not authorized to review this story' }, { status: 403 });
    }
    
    // Only allow updating checklist for stories in DRAFT or IN_REVIEW status
    if (!['DRAFT', 'IN_REVIEW'].includes(story.status)) {
      return NextResponse.json({ error: 'Cannot update checklist for stories in this status' }, { status: 400 });
    }
    
    // Update the story with the review checklist data
    const updatedStory = await prisma.story.update({
      where: { id },
      data: {
        reviewChecklist: checklist,
      },
      select: {
        id: true,
        reviewChecklist: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      reviewChecklist: updatedStory.reviewChecklist,
    });
  },
  [withErrorHandling, withAuth]
);

export { updateReviewChecklist as PATCH };