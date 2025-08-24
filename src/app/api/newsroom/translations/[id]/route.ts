import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canApproveTranslation, canWorkOnTranslation } from '@/lib/permissions';

// GET /api/newsroom/translations/[id]
const getTranslation = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const translation = await prisma.translation.findUnique({
      where: { id },
      include: {
        originalStory: {
          include: {
            author: true,
            category: true,
          },
        },
        translatedStory: {
          include: {
            author: true,
          },
        },
        assignedTo: true,
        reviewer: true,
      },
    });
    if (!translation) {
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }
    return NextResponse.json({ translation });
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/translations/[id]
const updateTranslation = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const data = await req.json();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current translation
    const currentTranslation = await prisma.translation.findUnique({
      where: { id },
      include: {
        assignedTo: true,
      },
    });

    if (!currentTranslation) {
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }

    const userRole = session.user.staffRole ?? null;

    // Check permissions for status changes
    if (data.status) {
      const isOwnTranslation = currentTranslation.assignedToId === session.user.id;
      
      // Check if user can work on this translation
      if (!canWorkOnTranslation(userRole, currentTranslation.assignedToId || '', session.user.id)) {
        return NextResponse.json({ error: 'Insufficient permissions to update this translation' }, { status: 403 });
      }

      // Validate status transitions
      if (data.status === 'APPROVED' && !canApproveTranslation(userRole)) {
        return NextResponse.json({ error: 'Insufficient permissions to approve translation' }, { status: 403 });
      }

      // Only allow certain status transitions
      const validTransitions: Record<string, string[]> = {
        PENDING: ['IN_PROGRESS'],
        IN_PROGRESS: ['NEEDS_REVIEW'],
        NEEDS_REVIEW: ['APPROVED', 'REJECTED'],
        REJECTED: ['IN_PROGRESS'],
        APPROVED: [], // No transitions from approved
      };

      const currentStatus = currentTranslation.status;
      const newStatus = data.status;

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json({ 
          error: `Invalid status transition from ${currentStatus} to ${newStatus}` 
        }, { status: 400 });
      }

      // Set additional fields based on status
      if (newStatus === 'APPROVED') {
        data.approvedAt = new Date();
        data.reviewerId = session.user.id;
      } else if (newStatus === 'REJECTED') {
        data.reviewerId = session.user.id;
      } else if (newStatus === 'NEEDS_REVIEW') {
        // Keep the reviewerId if provided (when submitting for approval)
        // If not provided, it will be null until someone reviews it
        data.reviewedAt = null; // Reset review timestamp
      }
    }

    // Use transaction to handle translation update and potential story status update
    const result = await prisma.$transaction(async (tx) => {
      const translation = await tx.translation.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          originalStory: {
            include: {
              author: true,
              category: true,
            },
          },
          translatedStory: {
            include: {
              author: true,
            },
          },
          assignedTo: true,
          reviewer: true,
        },
      });

      // If this translation was approved, check if all translations in the unit are now approved
      if (data.status === 'APPROVED') {
        const allTranslations = await tx.translation.findMany({
          where: { originalStoryId: translation.originalStoryId },
          select: { status: true },
        });

        const allApproved = allTranslations.every(t => t.status === 'APPROVED');
        
        // If all translations are approved, update story status to READY_TO_PUBLISH
        if (allApproved) {
          await tx.story.update({
            where: { id: translation.originalStoryId },
            data: { status: 'READY_TO_PUBLISH' },
          });
        }
      }

      return translation;
    });

    return NextResponse.json({ translation: result });
  },
  [withErrorHandling, withAuth]
);

export { getTranslation as GET, updateTranslation as PATCH }; 