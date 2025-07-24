import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';

function hasCategoryPermission(userRole: string | null, action: 'delete') {
  if (!userRole) return false;
  const permissions = {
    INTERN: [],
    JOURNALIST: [],
    SUB_EDITOR: [],
    EDITOR: ['delete'],
    ADMIN: ['delete'],
    SUPERADMIN: ['delete'],
  };
  return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
}

async function getDefaultCategory() {
  let defaultCategory = await prisma.category.findFirst({ where: { isDefault: true } });
  if (!defaultCategory) {
    // Create the default category if it doesn't exist
    defaultCategory = await prisma.category.create({
      data: {
        name: 'Uncategorised',
        slug: 'uncategorised',
        level: 1,
        isParent: true,
        isEditable: false,
        isDefault: true,
        description: 'Default category for uncategorised stories',
      },
    });
  }
  return defaultCategory;
}

const deleteCategory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as any).user;

    if (!hasCategoryPermission(user.staffRole, 'delete')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if category exists
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return Response.json({ error: 'Category not found' }, { status: 404 });
    }

    // Prevent deletion of the default category unless another is set as default
    if (category.isDefault) {
      const otherDefault = await prisma.category.findFirst({ where: { isDefault: true, id: { not: id } } });
      if (!otherDefault) {
        return Response.json({ error: 'Cannot delete the default category. Please set another category as default first.' }, { status: 400 });
      }
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
    return Response.json({ success: true });
  },
  [withErrorHandling, withAuth, withAudit('category.delete')]
);

export { deleteCategory as DELETE }; 