import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { tagCreateSchema } from '@/lib/validations';
import { TagCategory } from '@prisma/client';

// Helper function to check permissions
function hasTagPermission(userRole: string | null, action: 'create' | 'read' | 'update' | 'delete') {
  // If no staff role, deny access to newsroom features
  if (!userRole) {
    return false;
  }
  
  const permissions = {
    INTERN: ['read'],
    JOURNALIST: ['create', 'read'],
    SUB_EDITOR: ['create', 'read', 'update', 'delete'],
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

// GET /api/newsroom/tags - List tags
const getTags = createHandler(
  async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    
    if (!hasTagPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    const category = url.searchParams.get('category');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '50');

    const where: { OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; slug?: { contains: string; mode: 'insensitive' } }>; category?: TagCategory } = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' as const } },
        { slug: { contains: query, mode: 'insensitive' as const } },
      ];
    }
    
    if (category) {
      where.category = category as TagCategory;
    }

    // Parallel fetch: count and tags
    const [total, tags] = await Promise.all([
      prisma.tag.count({ where }),
      prisma.tag.findMany({
        where,
        include: {
          _count: {
            select: {
              stories: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const responseData = {
      tags,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };

    const response = NextResponse.json(responseData);
    // Cache for 5 minutes, revalidate in background for 10 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/tags - Create a new tag
const createTag = createHandler(
  async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const data = (req as NextRequest & { validatedData: { name: string; nameAfrikaans?: string; descriptionAfrikaans?: string; category?: string; color?: string; isRequired?: boolean; isPreset?: boolean } }).validatedData;

    if (!hasTagPermission(user.staffRole, 'create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Generate unique slug
    const baseSlug = generateSlug(data.name);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.tag.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        slug,
        nameAfrikaans: data.nameAfrikaans,
        descriptionAfrikaans: data.descriptionAfrikaans,
        category: data.category as TagCategory,
        color: data.color,
        isRequired: data.isRequired,
        isPreset: data.isPreset,
      },
      include: {
        _count: {
          select: {
            stories: true,
          },
        },
      },
    });

    return NextResponse.json(tag, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(tagCreateSchema),
    withAudit('tag.create'),
  ]
);

const deleteTag = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasTagPermission(user.staffRole, 'delete')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if tag exists
    const tag = await prisma.tag.findUnique({ where: { id }, include: { stories: true } });
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Prevent deletion if tag is in use and is LANGUAGE or RELIGION
    if ((tag.category === 'LANGUAGE' || tag.category === 'RELIGION') && tag.stories.length > 0) {
      return NextResponse.json({ error: 'Cannot delete a language or religion tag that is in use by stories.' }, { status: 400 });
    }

    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  },
  [withErrorHandling, withAuth, withAudit('tag.delete')]
);

export { getTags as GET, createTag as POST, deleteTag as DELETE }; 