import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { taskCreateSchema, taskSearchSchema } from '@/lib/validations';
import { Prisma, TaskStatus } from '@prisma/client';

// Helper function to check task permissions
function hasTaskPermission(userRole: string | null, action: 'create' | 'read' | 'update' | 'delete') {
  // If no staff role, deny access to tasks
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

// GET /api/tasks - List tasks with filtering and pagination
const getTasks = createHandler(
  async (req: NextRequest) => {
    const user = (req as any).user;
    
    if (!hasTaskPermission(user.staffRole, 'read')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams);
    
    const {
      query,
      status,
      type,
      priority,
      assignedToId,
      createdById,
      contentType,
      contentId,
      page = 1,
      perPage = 10
    } = taskSearchSchema.parse({
      ...searchParams,
      page: searchParams.page ? Number(searchParams.page) : 1,
      perPage: searchParams.perPage ? Number(searchParams.perPage) : 10,
    });

    // Build where clause
    const where: Prisma.TaskWhereInput = {
      ...(status && { status }),
      ...(type && { type }),
      ...(priority && { priority }),
      ...(assignedToId && { assignedToId }),
      ...(createdById && { createdById }),
      ...(contentType && { contentType }),
      ...(contentId && { contentId }),
      ...(query && {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      }),
    };

    // Role-based filtering - users see tasks assigned to them or created by them
    if (user.staffRole === 'INTERN' || user.staffRole === 'JOURNALIST') {
      where.OR = [
        { assignedToId: user.id },
        { createdById: user.id },
      ];
    }

    // Get total count
    const total = await prisma.task.count({ where });

    // Get paginated tasks
    const tasks = await prisma.task.findMany({
      where,
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
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return Response.json({
      tasks,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  },
  [withErrorHandling, withAuth]
);

// POST /api/tasks - Create a new task
const createTask = createHandler(
  async (req: NextRequest) => {
    const user = (req as any).user;
    const data = (req as any).validatedData;

    if (!hasTaskPermission(user.staffRole, 'create')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate that the assigned user exists and has appropriate role
    const assignedUser = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { id: true, staffRole: true, isActive: true },
    });

    if (!assignedUser || !assignedUser.isActive) {
      return Response.json({ error: 'Assigned user not found or inactive' }, { status: 400 });
    }

    // If contentId is provided, validate that the content exists
    if (data.contentId) {
      if (data.contentType === 'story') {
        const story = await prisma.story.findUnique({
          where: { id: data.contentId },
          select: { id: true },
        });
        if (!story) {
          return Response.json({ error: 'Story not found' }, { status: 400 });
        }
      }
      // Add validation for other content types when implemented
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        createdById: user.id,
        // Dates are already converted by the validation schema
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

    return Response.json(task, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(taskCreateSchema),
    withAudit('task.create'),
  ]
);

export { getTasks as GET, createTask as POST }; 