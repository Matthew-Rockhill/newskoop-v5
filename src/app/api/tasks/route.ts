import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { Prisma, TaskStatus, TaskType, TaskPriority } from '@prisma/client';
import { z } from 'zod';

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

// Helper function to build role-based task filtering
function buildTaskFilters(userRole: string, userId: string, queryParams: URLSearchParams) {
  const where: any = {};
  
  // Role-based filtering
  if (userRole === 'INTERN') {
    // Interns can only see their own tasks
    where.assignedToId = userId;
  } else if (userRole === 'JOURNALIST') {
    // Journalists can see their own tasks + tasks they need to review
    where.OR = [
      { assignedToId: userId },
      { 
        type: { in: ['STORY_REVIEW', 'STORY_REVISION_TO_JOURNALIST'] },
        status: { not: 'COMPLETED' }
      }
    ];
  }
  // SUB_EDITOR, EDITOR, ADMIN, SUPERADMIN can see all tasks
  
  // Status filtering
  const status = queryParams.get('status');
  if (status && Object.values(TaskStatus).includes(status as TaskStatus)) {
    where.status = status as TaskStatus;
  }
  
  // Type filtering
  const type = queryParams.get('type');
  if (type && Object.values(TaskType).includes(type as TaskType)) {
    where.type = type as TaskType;
  }
  
  // Priority filtering
  const priority = queryParams.get('priority');
  if (priority && Object.values(TaskPriority).includes(priority as TaskPriority)) {
    where.priority = priority as TaskPriority;
  }
  
  // Search filtering
  const query = queryParams.get('query');
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } }
    ];
  }
  
  return where;
}

// GET /api/tasks
const getTasks = createHandler(
  async (req: NextRequest, context?: any) => {
    const user = (req as any).user;
    
    if (!hasTaskPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '10');
    const skip = (page - 1) * perPage;
    
    // Build filters
    const where = buildTaskFilters(user.staffRole, user.id, searchParams);

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
            slug: true,
            status: true,
            language: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: perPage,
    });

    return NextResponse.json({
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

// Task creation schema
const createTaskSchema = z.object({
  type: z.nativeEnum(TaskType),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default('MEDIUM'),
  assignedToId: z.string().min(1, 'Assigned user is required'),
  contentType: z.string().min(1, 'Content type is required'),
  contentId: z.string().optional(),
  sourceLanguage: z.enum(['ENGLISH', 'AFRIKAANS', 'XHOSA']).optional(),
  targetLanguage: z.enum(['ENGLISH', 'AFRIKAANS', 'XHOSA']).optional(),
  dueDate: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  scheduledFor: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  metadata: z.record(z.any()).optional(),
});

// POST /api/tasks - Create a new task
const createTask = createHandler(
  async (req: NextRequest, context?: any) => {
    const user = (req as any).user;
    
    if (!hasTaskPermission(user.staffRole, 'create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    console.log('Raw request body:', body);
    
    let validatedData;
    try {
      validatedData = createTaskSchema.parse(body);
      console.log('Validated data:', validatedData);
    } catch (error) {
      console.error('Validation error:', error);
      return NextResponse.json({ error: 'Invalid request data', details: error }, { status: 400 });
    }

    // Verify assigned user exists and is active
    const assignedUser = await prisma.user.findFirst({
      where: {
        id: validatedData.assignedToId,
        isActive: true,
        userType: 'STAFF',
      },
    });

    if (!assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found or inactive' }, { status: 404 });
    }

    // If contentId is provided, verify the content exists
    if (validatedData.contentId) {
      const story = await prisma.story.findUnique({
        where: { id: validatedData.contentId },
      });

      if (!story) {
        return NextResponse.json({ error: 'Associated content not found' }, { status: 404 });
      }
    }

    const task = await prisma.task.create({
      data: {
        ...validatedData,
        createdById: user.id,
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
            slug: true,
            status: true,
            language: true,
          },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  },
  [withErrorHandling, withAuth, withAudit('CREATE_TASK')]
);

export { getTasks as GET, createTask as POST }; 