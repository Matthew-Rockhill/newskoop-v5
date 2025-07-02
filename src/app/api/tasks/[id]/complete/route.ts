import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { z } from 'zod';

const completeTaskSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
});

// PATCH /api/tasks/[id]/complete - Mark task as completed
const completeTask = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as any).user;
    
    let data;
    try {
      const body = await req.json();
      data = completeTaskSchema.parse(body);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Get current task
    const currentTask = await prisma.task.findUnique({
      where: { id },
      select: { 
        id: true, 
        assignedToId: true, 
        createdById: true, 
        status: true, 
        type: true,
        contentId: true,
        contentType: true 
      },
    });

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only assigned user can complete task
    if (currentTask.assignedToId !== user.id) {
      return NextResponse.json({ error: 'Only assigned user can complete this task' }, { status: 403 });
    }

    // Check if task is already completed
    if (currentTask.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Task is already completed' }, { status: 400 });
    }

    // Update task to completed
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(data.metadata && { metadata: data.metadata }),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
        story: {
          select: {
            id: true,
            title: true,
            status: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // TODO: Trigger workflow automation based on task type
    // This is where we'll add logic to automatically create next tasks
    // For example, when STORY_REVIEW is completed, create STORY_APPROVAL task
    
    return NextResponse.json(task);
  },
  [withErrorHandling, withAuth, withAudit('task.complete')]
);

export { completeTask as PATCH }; 