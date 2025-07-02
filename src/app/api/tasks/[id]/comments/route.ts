import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const commentCreateSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
  type: z.enum(['GENERAL', 'REVISION_REQUEST', 'APPROVAL', 'REJECTION', 'EDITORIAL_NOTE']).default('GENERAL'),
});

// GET /api/tasks/[id]/comments - Fetch task comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: true,
        createdBy: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user has access to this task
    const userRole = session.user.staffRole;
    const canAccess = 
      task.assignedTo.id === session.user.id ||
      task.createdBy.id === session.user.id ||
      ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole || '');

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch comments (we'll store them in task metadata for now, later can be separate table)
    const comments = task.metadata?.comments || [];

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching task comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/comments - Add a comment to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await request.json();
    
    // Validate request body
    const validatedData = commentCreateSchema.parse(body);

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: true,
        createdBy: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user has access to this task
    const userRole = session.user.staffRole;
    const canAccess = 
      task.assignedTo.id === session.user.id ||
      task.createdBy.id === session.user.id ||
      ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole || '');

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create new comment
    const newComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: validatedData.content,
      type: validatedData.type,
      createdAt: new Date().toISOString(),
      author: {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        staffRole: session.user.staffRole,
      },
    };

    // Get existing comments and add new one
    const existingComments = (task.metadata as any)?.comments || [];
    const updatedComments = [...existingComments, newComment];

    // Update task with new comment
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        metadata: {
          ...(task.metadata as any || {}),
          comments: updatedComments,
        },
        updatedAt: new Date(),
      },
    });

    // TODO: Create audit log when audit system is implemented
    // await createAuditLog({
    //   action: 'COMMENT_ADDED',
    //   entityType: 'TASK',
    //   entityId: taskId,
    //   userId: session.user.id,
    //   details: {
    //     commentType: validatedData.type,
    //     contentLength: validatedData.content.length,
    //   },
    // });

    return NextResponse.json({ 
      comment: newComment,
      message: 'Comment added successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error adding task comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 