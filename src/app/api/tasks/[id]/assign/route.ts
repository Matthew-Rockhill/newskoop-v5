import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { taskAssignmentSchema } from '@/lib/validations';

// PATCH /api/tasks/[id]/assign - Assign task to a user
const assignTask = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as any).user;
    const data = (req as any).validatedData;

    // Get current task
    const currentTask = await prisma.task.findUnique({
      where: { id },
      select: { 
        id: true, 
        assignedToId: true, 
        createdById: true, 
        status: true, 
        type: true 
      },
    });

    if (!currentTask) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permissions - only creator or editors+ can reassign tasks
    const canAssign = currentTask.createdById === user.id ||
                     ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user.staffRole);

    if (!canAssign) {
      return Response.json({ error: 'Insufficient permissions to assign this task' }, { status: 403 });
    }

    // Validate that the assigned user exists and is active
    const assignedUser = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { id: true, staffRole: true, isActive: true },
    });

    if (!assignedUser || !assignedUser.isActive) {
      return Response.json({ error: 'Assigned user not found or inactive' }, { status: 400 });
    }

    // Update task assignment
    const task = await prisma.task.update({
      where: { id },
      data: {
        assignedToId: data.assignedToId,
        status: currentTask.status === 'PENDING_ASSIGNMENT' ? 'PENDING' : currentTask.status,
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        // Store assignment notes in metadata
        ...(data.notes && {
          metadata: {
            ...(currentTask as any).metadata,
            assignmentNotes: data.notes,
            reassignedAt: new Date().toISOString(),
            reassignedBy: user.id,
          }
        }),
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

    return Response.json(task);
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(taskAssignmentSchema),
    withAudit('task.assign'),
  ]
);

export { assignTask as PATCH }; 