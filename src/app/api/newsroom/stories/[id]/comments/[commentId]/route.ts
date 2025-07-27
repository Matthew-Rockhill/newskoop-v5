import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation } from '@/lib/api-handler';
import { commentUpdateSchema } from '@/lib/validations';
import { hasCommentPermission } from '@/lib/permissions'; // ← Import hasCommentPermission from permissions file

// Helper function to check if user can resolve revision notes
function canResolveRevisionNote(userRole: string, storyAuthorId: string, userId: string, storyAssignedToId: string | null, storyReviewerId: string | null) {
  // Admins and editors can always resolve revision notes
  if (userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'EDITOR') {
    return true;
  }
  
  // Sub-editors can resolve if they're assigned to the story
  if (userRole === 'SUB_EDITOR' && storyAssignedToId === userId) {
    return true;
  }
  
  // Story authors can resolve revision notes on their own stories
  if (storyAuthorId === userId) {
    return true;
  }
  
  // Reviewers can resolve revision notes on stories they're reviewing
  if (storyReviewerId === userId) {
    return true;
  }
  
  return false;
}

// PATCH /api/newsroom/stories/[id]/comments/[commentId] - Update a comment
const updateComment = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) => {
    const { id: storyId, commentId } = await params;
    const user = req.user;
    const data = req.validatedData;

    console.log('PATCH comment request:', {
      storyId,
      commentId,
      userRole: user.staffRole,
      userId: user.id,
      data
    });

    console.log('Checking comment permissions:', {
      userRole: user.staffRole,
      action: 'update',
      hasPermission: hasCommentPermission(user.staffRole, 'update') // ← Use imported function
    });

    if (!hasCommentPermission(user.staffRole, 'update')) { // ← Use imported function
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the comment and verify it exists and belongs to the story
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        story: {
          select: {
            id: true,
            authorId: true,
            assignedToId: true,
            reviewerId: true,
            status: true,
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
      },
    });

    console.log('Comment lookup result:', {
      commentFound: !!comment,
      storyId: comment?.story?.id,
      storyAuthorId: comment?.story?.authorId,
      storyAssignedToId: comment?.story?.assignedToId,
      storyReviewerId: comment?.story?.reviewerId,
      storyStatus: comment?.story?.status,
      commentType: comment?.type
    });

    if (!comment) {
      return Response.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.story.id !== storyId) {
      return Response.json({ error: 'Comment does not belong to this story' }, { status: 400 });
    }

    // Check if user has access to the story
    const story = comment.story;
    
    // Role-based access control
    if (user.staffRole === 'INTERN' && story.authorId !== user.id) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    if (user.staffRole === 'JOURNALIST') {
      const hasAccess = story.authorId === user.id || 
                       story.assignedToId === user.id || 
                       story.reviewerId === user.id;
      if (!hasAccess) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // For revision notes, check specific resolution permissions
    if (comment.type === 'REVISION_REQUEST' && data.isResolved !== undefined) {
      console.log('Revision note resolution check:', {
        userRole: user.staffRole,
        storyAuthorId: story.authorId,
        currentUserId: user.id,
        storyAssignedToId: story.assignedToId,
        storyReviewerId: story.reviewerId,
        storyStatus: story.status
      });
      
      const canResolve = canResolveRevisionNote(
        user.staffRole, 
        story.authorId, 
        user.id, 
        story.assignedToId, 
        story.reviewerId
      );
      
      console.log('Can resolve revision note:', canResolve);
      
      if (!canResolve) {
        return Response.json({ 
          error: 'You do not have permission to resolve this revision note. Only story authors, assigned editors, reviewers, and administrators can resolve revision notes.' 
        }, { status: 403 });
      }
    }
    // For regular comment content updates (not revision resolution), check if user can edit comments
    else if (data.content !== undefined) {
      // Only check if the user is the comment author or has higher permissions
      const isCommentAuthor = comment.author.id === user.id;
      const hasHigherRole = ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user.staffRole);
      
      if (!isCommentAuthor && !hasHigherRole) {
        return Response.json({ error: 'You can only edit your own comments' }, { status: 403 });
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    
    if (data.isResolved !== undefined) {
      updateData.isResolved = data.isResolved;
      if (data.isResolved) {
        updateData.resolvedBy = user.id;
        updateData.resolvedAt = new Date();
      } else {
        updateData.resolvedBy = null;
        updateData.resolvedAt = null;
      }
    }

    console.log('Updating comment with data:', updateData);

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
        resolver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    console.log('Comment updated successfully:', {
      commentId: updatedComment.id,
      isResolved: updatedComment.isResolved,
      resolvedBy: updatedComment.resolvedBy
    });

    return Response.json(updatedComment);
  },
  [withErrorHandling, withAuth, withValidation(commentUpdateSchema)]
);

export { updateComment as PATCH };