import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { taskUpdateSchema } from '@/lib/validations';

// Helper function to check task permissions
function hasTaskPermission(userRole: string | null, action: 'create' | 'read' | 'update' | 'delete') {
  if (!userRole) {
    return false;
  }
  
  const permissions = {
    INTERN: ['create', 'read', 'update'],
    JOURNALIST: ['create', 'read', 'update'],
    SUB_EDITOR: ['create', 'read', 'update', 'delete'],
    EDITOR: ['create', 'read', 'update', 'delete'],
    ADMIN: ['create', 'read', 'update', 'delete'],
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
  };
  
  return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
}

// Helper function to check if user can access specific task
async function canAccessTask(userId: string, userRole: string, taskId: string) {
  if (!hasTaskPermission(userRole, 'read')) {
    return false;
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assignedToId: true, createdById: true },
  });

  if (!task) return false;

  // Editors and above can access any task
  if (['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
    return true;
  }

  // Users can access tasks assigned to them or created by them
  return task.assignedToId === userId || task.createdById === userId;
}

// GET /api/tasks/[id] - Get a single task
const getTask = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as any).user;

    const canAccess = await canAccessTask(user.id, user.staffRole, id);
    if (!canAccess) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
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
            content: true,
            summary: true,
            priority: true,
            language: true,
            religiousFilter: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
              },
            },
            tags: {
              include: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    color: true,
                  },
                },
              },
            },
            audioClips: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                url: true,
                duration: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    return Response.json(task);
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/tasks/[id] - Update a task
const updateTask = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as any).user;
    const data = (req as any).validatedData;

    const canAccess = await canAccessTask(user.id, user.staffRole, id);
    if (!canAccess) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get current task to check permissions
    const currentTask = await prisma.task.findUnique({
      where: { id },
      select: { assignedToId: true, createdById: true, status: true },
    });

    if (!currentTask) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only assigned user or creator can update task
    const canUpdate = currentTask.assignedToId === user.id || 
                     currentTask.createdById === user.id ||
                     ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user.staffRole);

    if (!canUpdate) {
      return Response.json({ error: 'Insufficient permissions to update this task' }, { status: 403 });
    }

    // If reassigning task, validate new assignee
    if (data.assignedToId && data.assignedToId !== currentTask.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: data.assignedToId },
        select: { id: true, staffRole: true, isActive: true },
      });

      if (!assignedUser || !assignedUser.isActive) {
        return Response.json({ error: 'Assigned user not found or inactive' }, { status: 400 });
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        // Convert date strings to Date objects if provided
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        ...(data.scheduledFor && { scheduledFor: new Date(data.scheduledFor) }),
        ...(data.completedAt && { completedAt: new Date(data.completedAt) }),
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
    withValidation(taskUpdateSchema),
    withAudit('task.update'),
  ]
);

// DELETE /api/tasks/[id] - Delete a task
const deleteTask = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as any).user;

    if (!hasTaskPermission(user.staffRole, 'delete')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, status: true, createdById: true },
    });

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only creator or editors+ can delete tasks
    const canDelete = task.createdById === user.id ||
                     ['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user.staffRole);

    if (!canDelete) {
      return Response.json({ error: 'Insufficient permissions to delete this task' }, { status: 403 });
    }

    // Don't allow deletion of completed tasks unless admin
    if (task.status === 'COMPLETED' && !['ADMIN', 'SUPERADMIN'].includes(user.staffRole)) {
      return Response.json({ error: 'Cannot delete completed tasks' }, { status: 400 });
    }

    await prisma.task.delete({
      where: { id },
    });

    return Response.json({ message: 'Task deleted successfully' });
  },
  [withErrorHandling, withAuth, withAudit('task.delete')]
);

export { getTask as GET, updateTask as PATCH, deleteTask as DELETE }; 