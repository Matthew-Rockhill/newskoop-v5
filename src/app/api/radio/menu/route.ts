import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { MenuItemType } from '@prisma/client';

// Build nested menu tree from flat list
function buildMenuTree(items: Array<{
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
}>) {
  type MenuItem = typeof items[0] & { children: MenuItem[] };
  const itemMap = new Map<string, MenuItem>();
  const roots: MenuItem[] = [];

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
  const sortChildren = (node: MenuItem) => {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder);
    node.children.forEach(sortChildren);
  };
  roots.forEach(sortChildren);

  return roots.sort((a, b) => a.sortOrder - b.sortOrder);
}

// GET /api/radio/menu - Get menu for radio navbar
const getRadioMenu = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; userType: string; radioStationId?: string } }).user;

    // Get station for filtering blocked categories
    let blockedCategories: string[] = [];

    if (user.userType === 'RADIO' && user.radioStationId) {
      const station = await prisma.station.findUnique({
        where: { id: user.radioStationId },
        select: { blockedCategories: true },
      });
      blockedCategories = station?.blockedCategories || [];
    }

    // Fetch visible menu items
    const menuItems = await prisma.menuItem.findMany({
      where: {
        isVisible: true,
        // Exclude menu items that link to blocked categories
        OR: [
          { categoryId: null }, // Non-category items always included
          {
            category: {
              id: { notIn: blockedCategories },
            },
          },
        ],
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
      orderBy: [
        { sortOrder: 'asc' },
        { label: 'asc' },
      ],
    });

    // Build nested tree structure
    const menuTree = buildMenuTree(menuItems);

    const response = NextResponse.json({ menu: menuTree });
    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  },
  [withErrorHandling, withAuth]
);

export { getRadioMenu as GET };
