import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation } from '@/lib/api-handler';
import { commentCreateSchema } from '@/lib/validations';

// Helper function to check permissions
function hasCommentPermission(userRole: string | null, action: 'create' | 'read' | 'update' | 'delete') {
  // If no staff role, deny access to newsroom features
  if (!userRole) {
    return false;
  }
  
  const permissions = {
    INTERN: ['create', 'read'],
    JOURNALIST: ['create', 'read', 'update'],
    SUB_EDITOR: ['create', 'read', 'update', 'delete'],
    EDITOR: ['create', 'read', 'update', 'delete'],
    ADMIN: ['create', 'read', 'update', 'delete'],
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
  };
  
  return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
}

// GET /api/newsroom/stories/[id]/comments - Get comments for a story
const getComments = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: storyId } = await params;
    const user = (req as any).user;
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (!hasCommentPermission(user.staffRole, 'read')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if user has access to the story
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { 
        id: true, 
        authorId: true, 
        assignedToId: true, 
        reviewerId: true 
      },
    });

    if (!story) {
      return Response.json({ error: 'Story not found' }, { status: 404 });
    }

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

    const whereClause: any = {
      storyId,
      parentId: null, // Only get top-level comments
    };

    // Filter by type if specified
    if (type) {
      whereClause.type = type;
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
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
        replies: {
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
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ comments });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/stories/[id]/comments - Create a new comment
const createComment = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: storyId } = await params;
    const user = (req as any).user;
    const data = (req as any).validatedData;

    if (!hasCommentPermission(user.staffRole, 'create')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if user has access to the story
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { 
        id: true, 
        authorId: true, 
        assignedToId: true, 
        reviewerId: true,
        title: true,
      },
    });

    if (!story) {
      return Response.json({ error: 'Story not found' }, { status: 404 });
    }

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

    // Validate parent comment if provided
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId },
        select: { storyId: true },
      });

      if (!parentComment || parentComment.storyId !== storyId) {
        return Response.json({ error: 'Invalid parent comment' }, { status: 400 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        type: data.type,
        category: data.category,
        storyId,
        authorId: user.id,
        parentId: data.parentId,
      },
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
        replies: {
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
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'comment.create',
        entityType: 'Comment',
        entityId: comment.id,
        metadata: {
          storyId,
          storyTitle: story.title,
          commentType: data.type,
          isReply: !!data.parentId,
        },
      },
    });

    return Response.json(comment, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(commentCreateSchema),
  ]
);

export { getComments as GET, createComment as POST }; 