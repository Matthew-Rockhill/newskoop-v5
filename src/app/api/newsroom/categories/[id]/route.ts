import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { z } from 'zod';

function hasCategoryPermission(userRole: string | null, action: 'update' | 'delete') {
  if (!userRole) return false;
  const permissions: Record<string, string[]> = {
    INTERN: [],
    JOURNALIST: [],
    SUB_EDITOR: ['update', 'delete'],
    EDITOR: ['update', 'delete'],
    ADMIN: ['update', 'delete'],
    SUPERADMIN: ['update', 'delete'],
  };
  return permissions[userRole]?.includes(action) || false;
}

const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  nameAfrikaans: z.string().optional(),
  description: z.string().optional(),
  descriptionAfrikaans: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
  parentId: z.string().nullable().optional(),
});

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// GET /api/newsroom/categories/[id] - Get single category
const getCategory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            level: true,
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

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/categories/[id] - Update category
const updateCategory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasCategoryPermission(user.staffRole, 'update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const data = categoryUpdateSchema.parse(body);

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if category is editable
    if (!existingCategory.isEditable) {
      return NextResponse.json({ error: 'This category cannot be edited' }, { status: 400 });
    }

    // If name is being updated, check uniqueness and regenerate slug
    let updateData: any = { ...data };

    if (data.name && data.name !== existingCategory.name) {
      const duplicate = await prisma.category.findUnique({ where: { name: data.name } });
      if (duplicate) {
        return NextResponse.json({ error: 'A category with this name already exists' }, { status: 400 });
      }

      // Generate unique slug
      const baseSlug = generateSlug(data.name);
      let slug = baseSlug;
      let counter = 1;

      while (await prisma.category.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      updateData.slug = slug;
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            level: true,
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

    return NextResponse.json({ category: updatedCategory });
  },
  [withErrorHandling, withAuth, withAudit('category.update')]
);

async function getDefaultCategory() {
  // Find any category to use as default (or first created one)
  let defaultCategory = await prisma.category.findFirst({ 
    where: { name: 'Uncategorised' } 
  });
  if (!defaultCategory) {
    // Create the default category if it doesn't exist
    defaultCategory = await prisma.category.create({
      data: {
        name: 'Uncategorised',
        slug: 'uncategorised',
        level: 1,
        isParent: true,
        isEditable: false,
        description: 'Default category for uncategorised stories',
      },
    });
  }
  return defaultCategory;
}

const deleteCategory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasCategoryPermission(user.staffRole, 'delete')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if category exists
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Prevent deletion of the Uncategorised category
    if (category.name === 'Uncategorised') {
      return NextResponse.json({ error: 'Cannot delete the default Uncategorised category.' }, { status: 400 });
    }

    // Get or create the default category
    const defaultCategory = await getDefaultCategory();

    // Reassign all stories with this category to the default category
    await prisma.story.updateMany({
      where: { categoryId: id },
      data: { categoryId: defaultCategory.id },
    });

    // Delete the category
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  },
  [withErrorHandling, withAuth, withAudit('category.delete')]
);

export { getCategory as GET };
export { updateCategory as PATCH };
export { deleteCategory as DELETE }; 