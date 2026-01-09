import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { menuItemUpdateSchema } from '@/lib/validations';
import { MenuItemType } from '@prisma/client';

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

// GET /api/newsroom/menu/[id] - Get a single menu item
const getMenuItem = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const { id } = await params;

    if (!hasMenuPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameAfrikaans: true,
            slug: true,
          },
        },
        children: {
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
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json(menuItem);
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/menu/[id] - Update a menu item
const updateMenuItem = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const { id } = await params;
    const data = (req as NextRequest & { validatedData: {
      label?: string;
      labelAfrikaans?: string | null;
      type?: MenuItemType;
      categoryId?: string | null;
      url?: string | null;
      openInNewTab?: boolean;
      parentId?: string | null;
      sortOrder?: number;
      isVisible?: boolean;
      icon?: string | null;
    } }).validatedData;

    if (!hasMenuPermission(user.staffRole, 'update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if menu item exists
    const existing = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Validate category exists if type is CATEGORY and categoryId is provided
    const newType = data.type || existing.type;
    if (newType === 'CATEGORY' && data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 });
      }
    }

    // Validate parent exists if provided and not self-referencing
    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === id) {
        return NextResponse.json({ error: 'Menu item cannot be its own parent' }, { status: 400 });
      }
      const parent = await prisma.menuItem.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent menu item not found' }, { status: 400 });
      }
      // Check for circular reference (parent is a descendant of this item)
      let current = parent;
      while (current.parentId) {
        if (current.parentId === id) {
          return NextResponse.json({ error: 'Circular reference detected' }, { status: 400 });
        }
        const next = await prisma.menuItem.findUnique({ where: { id: current.parentId } });
        if (!next) break;
        current = next;
      }
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        label: data.label,
        labelAfrikaans: data.labelAfrikaans,
        type: data.type,
        categoryId: data.categoryId,
        url: data.url,
        openInNewTab: data.openInNewTab,
        parentId: data.parentId,
        sortOrder: data.sortOrder,
        isVisible: data.isVisible,
        icon: data.icon,
      },
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
    });

    return NextResponse.json(menuItem);
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(menuItemUpdateSchema),
    withAudit('menu.update'),
  ]
);

// DELETE /api/newsroom/menu/[id] - Delete a menu item (cascades to children)
const deleteMenuItem = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const { id } = await params;

    if (!hasMenuPermission(user.staffRole, 'delete')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if menu item exists
    const existing = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: { children: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Delete menu item (children will be cascade deleted due to schema)
    await prisma.menuItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deletedChildren: existing._count.children,
    });
  },
  [
    withErrorHandling,
    withAuth,
    withAudit('menu.delete'),
  ]
);

export { getMenuItem as GET, updateMenuItem as PATCH, deleteMenuItem as DELETE };
