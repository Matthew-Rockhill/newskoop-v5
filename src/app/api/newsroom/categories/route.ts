import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { categoryCreateSchema } from '@/lib/validations';

// Helper function to check permissions
function hasCategoryPermission(userRole: string | null, action: 'create' | 'read' | 'update' | 'delete') {
  // If no staff role, deny access to newsroom features
  if (!userRole) {
    return false;
  }
  
  const permissions = {
    INTERN: ['read'],
    JOURNALIST: ['read'],
    SUB_EDITOR: ['create', 'read', 'update'],
    EDITOR: ['create', 'read', 'update', 'delete'],
    ADMIN: ['create', 'read', 'update', 'delete'],
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
  };
  
  return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
}

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// GET /api/newsroom/categories - List categories with hierarchy
const getCategories = createHandler(
  async (req: NextRequest) => {
    const user = (req as any).user;
    
    if (!hasCategoryPermission(user.staffRole, 'read')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const flat = url.searchParams.get('flat') === 'true';
    const level = url.searchParams.get('level');

    if (flat) {
      // Return flat list of categories
      const categories = await prisma.category.findMany({
        ...(level && { where: { level: parseInt(level) } }),
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              stories: true,
              children: true,
            },
          },
        },
        orderBy: [
          { level: 'asc' },
          { name: 'asc' },
        ],
      });

      return Response.json({ categories });
    }

    // Return hierarchical structure
    const categories = await prisma.category.findMany({
      where: { parentId: null }, // Root categories only
      include: {
        children: {
          include: {
            children: {
              include: {
                _count: {
                  select: {
                    stories: true,
                  },
                },
              },
            },
            _count: {
              select: {
                stories: true,
                children: true,
              },
            },
          },
        },
        _count: {
          select: {
            stories: true,
            children: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return Response.json({ categories });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/categories - Create a new category
const createCategory = createHandler(
  async (req: NextRequest) => {
    const user = (req as any).user;
    const data = (req as any).validatedData;

    if (!hasCategoryPermission(user.staffRole, 'create')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Determine level based on parent
    let level = 1;
    let isParent = false;

    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
        select: { level: true },
      });

      if (!parent) {
        return Response.json({ error: 'Parent category not found' }, { status: 400 });
      }

      level = parent.level + 1;

      // Enforce 3-level hierarchy
      if (level > 3) {
        return Response.json({ error: 'Maximum category depth is 3 levels' }, { status: 400 });
      }
    } else {
      isParent = true;
    }

    // Generate unique slug
    const baseSlug = generateSlug(data.name);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const category = await prisma.category.create({
      data: {
        ...data,
        slug,
        level,
        isParent,
        isEditable: !isParent, // Parent categories are not directly editable for stories
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            stories: true,
            children: true,
          },
        },
      },
    });

    return Response.json(category, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(categoryCreateSchema),
    withAudit('category.create'),
  ]
);

export { getCategories as GET, createCategory as POST }; 