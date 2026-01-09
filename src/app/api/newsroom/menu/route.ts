import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { menuItemCreateSchema } from '@/lib/validations';
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

// Menu item type for tree building
type MenuItemBase = {
  id: string;
  label: string;
  labelAfrikaans: string | null;
  type: MenuItemType;
  categoryId: string | null;
  category: { id: string; name: string; nameAfrikaans: string | null; slug: string } | null;
  url: string | null;
  openInNewTab: boolean;
  parentId: string | null;
  sortOrder: number;
  isVisible: boolean;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MenuItemWithChildren = MenuItemBase & { children: MenuItemWithChildren[] };

// Build nested menu tree from flat list
function buildMenuTree(items: MenuItemBase[]): MenuItemWithChildren[] {
  const itemMap = new Map<string, MenuItemWithChildren>();
  const roots: MenuItemWithChildren[] = [];

  // First pass: create map and initialize children array
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build tree
  items.forEach(item => {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by sortOrder
  const sortChildren = (node: MenuItemWithChildren) => {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder);
    node.children.forEach(sortChildren);
  };
  roots.forEach(sortChildren);

  return roots.sort((a, b) => a.sortOrder - b.sortOrder);
}

// GET /api/newsroom/menu - List all menu items
const getMenuItems = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasMenuPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const flat = url.searchParams.get('flat') === 'true';

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

    if (flat) {
      return NextResponse.json({ menuItems });
    }

    // Build nested tree structure
    const menuTree = buildMenuTree(menuItems);
    return NextResponse.json({ menuItems: menuTree });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/menu - Create a new menu item
const createMenuItem = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const data = (req as NextRequest & { validatedData: {
      label: string;
      labelAfrikaans?: string;
      type: MenuItemType;
      categoryId?: string;
      url?: string;
      openInNewTab?: boolean;
      parentId?: string;
      sortOrder?: number;
      isVisible?: boolean;
      icon?: string;
    } }).validatedData;

    if (!hasMenuPermission(user.staffRole, 'create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate category exists if type is CATEGORY
    if (data.type === 'CATEGORY' && data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 });
      }
    }

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await prisma.menuItem.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent menu item not found' }, { status: 400 });
      }
    }

    // Get next sort order if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await prisma.menuItem.aggregate({
        where: { parentId: data.parentId || null },
        _max: { sortOrder: true },
      });
      sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        label: data.label,
        labelAfrikaans: data.labelAfrikaans,
        type: data.type,
        categoryId: data.categoryId,
        url: data.url,
        openInNewTab: data.openInNewTab ?? false,
        parentId: data.parentId,
        sortOrder,
        isVisible: data.isVisible ?? true,
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

    return NextResponse.json(menuItem, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(menuItemCreateSchema),
    withAudit('menu.create'),
  ]
);

export { getMenuItems as GET, createMenuItem as POST };
