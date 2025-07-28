import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';

function hasCategoryPermission(userRole: string | null, action: 'delete') {
  if (!userRole) return false;
  const permissions: Record<string, string[]> = {
    INTERN: [],
    JOURNALIST: [],
    SUB_EDITOR: [],
    EDITOR: ['delete'],
    ADMIN: ['delete'],
    SUPERADMIN: ['delete'],
  };
  return permissions[userRole]?.includes(action) || false;
}

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

export { deleteCategory as DELETE }; 