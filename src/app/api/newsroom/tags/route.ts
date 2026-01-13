import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { tagCreateSchema } from '@/lib/validations';
import { generateSlug, generateUniqueTagSlug } from '@/lib/slug-utils';

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

// GET /api/newsroom/tags - List tags
const getTags = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasTagPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('query');

    const where: { OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; slug?: { contains: string; mode: 'insensitive' } }> } = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' as const } },
        { slug: { contains: query, mode: 'insensitive' as const } },
      ];
    }

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
      }),
    ]);

    return NextResponse.json({ tags, total });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/tags - Create a new tag
const createTag = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const data = (req as NextRequest & { validatedData: { name: string; nameAfrikaans?: string; descriptionAfrikaans?: string; color?: string } }).validatedData;

    if (!hasTagPermission(user.staffRole, 'create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Generate unique slug with optimized single-query approach
    const baseSlug = generateSlug(data.name);
    const slug = await generateUniqueTagSlug(baseSlug);

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        slug,
        nameAfrikaans: data.nameAfrikaans,
        descriptionAfrikaans: data.descriptionAfrikaans,
        color: data.color,
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

export { getTags as GET, createTag as POST };
