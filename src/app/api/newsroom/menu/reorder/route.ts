import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { menuReorderSchema } from '@/lib/validations';

// Helper function to check permissions
function hasMenuPermission(userRole: string | null, action: 'create' | 'read' | 'update' | 'delete') {
  if (!userRole) {
    return false;
  }

  const permissions: Record<string, string[]> = {
    INTERN: ['read'],
    JOURNALIST: ['read'],
    SUB_EDITOR: ['read'],
    EDITOR: ['create', 'read', 'update', 'delete'],
    ADMIN: ['create', 'read', 'update', 'delete'],
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
  };

  return permissions[userRole]?.includes(action) || false;
}

// POST /api/newsroom/menu/reorder - Batch reorder menu items
const reorderMenuItems = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const data = (req as NextRequest & { validatedData: {
      items: Array<{
        id: string;
        parentId: string | null;
        sortOrder: number;
      }>;
    } }).validatedData;

    if (!hasMenuPermission(user.staffRole, 'update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate all items exist
    const itemIds = data.items.map(item => item.id);
    const existingItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true },
    });

    const existingIds = new Set(existingItems.map(item => item.id));
    const missingIds = itemIds.filter(id => !existingIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Menu items not found: ${missingIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate parent IDs exist (if not null)
    const parentIds = data.items
      .filter(item => item.parentId !== null)
      .map(item => item.parentId as string);

    if (parentIds.length > 0) {
      const existingParents = await prisma.menuItem.findMany({
        where: { id: { in: parentIds } },
        select: { id: true },
      });

      const existingParentIds = new Set(existingParents.map(p => p.id));
      const missingParentIds = parentIds.filter(id => !existingParentIds.has(id));

      if (missingParentIds.length > 0) {
        return NextResponse.json(
          { error: `Parent menu items not found: ${missingParentIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Check for circular references
    const idToParent = new Map(data.items.map(item => [item.id, item.parentId]));
    for (const item of data.items) {
      const visited = new Set<string>();
      let currentId: string | null = item.id;

      while (currentId) {
        if (visited.has(currentId)) {
          return NextResponse.json(
            { error: `Circular reference detected involving item ${item.id}` },
            { status: 400 }
          );
        }
        visited.add(currentId);
        currentId = idToParent.get(currentId) || null;
      }
    }

    // Update all items in a transaction
    await prisma.$transaction(
      data.items.map(item =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: {
            parentId: item.parentId,
            sortOrder: item.sortOrder,
          },
        })
      )
    );

    // Fetch updated menu tree
    const menuItems = await prisma.menuItem.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameAfrikaans: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { label: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      updatedCount: data.items.length,
      menuItems,
    });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(menuReorderSchema),
    withAudit('menu.reorder'),
  ]
);

export { reorderMenuItems as POST };
