import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { categoryCreateSchema } from '@/lib/validations';
import { generateSlug, generateUniqueCategorySlug } from '@/lib/slug-utils';

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


// GET /api/newsroom/categories - List categories with hierarchy
const getCategories = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    
    if (!hasCategoryPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const flat = url.searchParams.get('flat') === 'true';
    const level = url.searchParams.get('level');
    const search = url.searchParams.get('search');

    if (flat) {
      // Return flat list of categories
      const whereClause: { level?: number; OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }> } = {};
      
      if (level) {
        whereClause.level = parseInt(level);
      }
      
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const categories = await prisma.category.findMany({
        where: whereClause,
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

      const response = NextResponse.json({ categories });
      // Cache for 5 minutes, revalidate in background for 10 minutes
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return response;
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

    const response = NextResponse.json({ categories });
    // Cache for 5 minutes, revalidate in background for 10 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/categories - Create a new category
const createCategory = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const data = (req as NextRequest & { validatedData: { name: string; parentId?: string; description?: string } }).validatedData;

    if (!hasCategoryPermission(user.staffRole, 'create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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
        return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
      }

      level = parent.level + 1;

      // Enforce 3-level hierarchy
      if (level > 3) {
        return NextResponse.json({ error: 'Maximum category depth is 3 levels' }, { status: 400 });
      }
    } else {
      isParent = true;
    }

    // Generate unique slug with optimized single-query approach
    const baseSlug = generateSlug(data.name);
    const slug = await generateUniqueCategorySlug(baseSlug);

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

    return NextResponse.json(category, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(categoryCreateSchema),
    withAudit('category.create'),
  ]
);

export { getCategories as GET, createCategory as POST }; 