import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { MenuItemType } from '@prisma/client';

const LANG_ABBREV: Record<string, string> = {
  ENGLISH: 'EN',
  AFRIKAANS: 'AF',
  XHOSA: 'XH',
  ZULU: 'ZU',
};

const LANGUAGE_NAME_MAP: Record<string, string> = {
  'English': 'ENGLISH',
  'Afrikaans': 'AFRIKAANS',
  'Xhosa': 'XHOSA',
  'Zulu': 'ZULU',
};

// Build nested menu tree from flat list
function buildMenuTree(items: Array<{
  id: string;
  label: string;
  labelAfrikaans: string | null;
  type: MenuItemType;
  categoryId: string | null;
  category: { id: string; name: string; nameAfrikaans: string | null; slug: string; parent: { slug: string } | null } | null;
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

// Create a virtual menu item (not persisted in DB)
function virtualMenuItem(overrides: {
  label: string;
  url: string;
  icon?: string | null;
  sortOrder: number;
  parentId: string;
  children?: ReturnType<typeof buildMenuTree>;
}) {
  return {
    id: `virtual-${overrides.parentId}-${overrides.sortOrder}`,
    label: overrides.label,
    labelAfrikaans: null,
    type: 'CUSTOM_LINK' as MenuItemType,
    categoryId: null,
    category: null,
    url: overrides.url,
    openInNewTab: false,
    parentId: overrides.parentId,
    sortOrder: overrides.sortOrder,
    isVisible: true,
    icon: overrides.icon ?? null,
    children: overrides.children ?? [],
  };
}

// Dynamically inject children for News Bulletins and Speciality
async function injectDynamicChildren(
  menuTree: ReturnType<typeof buildMenuTree>,
  allowedLanguageEnums: string[]
) {
  const bulletinsItem = menuTree.find(item => item.url === '/radio/bulletins');
  const specialityItem = menuTree.find(item => item.url === '/radio/shows');

  // Run both queries in parallel
  const [schedules, shows] = await Promise.all([
    bulletinsItem
      ? prisma.bulletinSchedule.findMany({
          where: {
            isActive: true,
            ...(allowedLanguageEnums.length > 0
              ? { language: { in: allowedLanguageEnums as any } }
              : {}),
          },
          orderBy: [{ time: 'asc' }, { language: 'asc' }],
        })
      : Promise.resolve([]),
    specialityItem
      ? prisma.show.findMany({
          where: {
            isActive: true,
            isPublished: true,
            parentId: null,
          },
          include: {
            subShows: {
              where: { isActive: true, isPublished: true },
              orderBy: { title: 'asc' },
            },
          },
          orderBy: { title: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  // Inject all bulletin schedule children (client-side navbar handles time windowing)
  if (bulletinsItem) {
    bulletinsItem.children = schedules.map((schedule, i) => {
      const langAbbrev = LANG_ABBREV[schedule.language] || schedule.language;
      return virtualMenuItem({
        label: schedule.title,
        url: `/radio/bulletins?scheduleId=${schedule.id}`,
        icon: `${langAbbrev}|${schedule.time}`,
        sortOrder: i + 1,
        parentId: bulletinsItem.id,
      });
    });
  }

  // Inject show children (with sub-show grandchildren)
  if (specialityItem) {
    specialityItem.children = shows.map((show, i) => {
      const subShowChildren = (show.subShows ?? []).map((sub, j) =>
        virtualMenuItem({
          label: sub.title,
          url: `/radio/shows?showId=${sub.id}`,
          sortOrder: j + 1,
          parentId: `virtual-${specialityItem.id}-${i + 1}`,
        })
      );
      return virtualMenuItem({
        label: show.title,
        url: `/radio/shows?showId=${show.id}`,
        sortOrder: i + 1,
        parentId: specialityItem.id,
        children: subShowChildren,
      });
    });
  }
}

// GET /api/radio/menu - Get menu for radio navbar
const getRadioMenu = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; userType: string; radioStationId?: string } }).user;

    // Get station for filtering blocked categories and language filtering
    let blockedCategories: string[] = [];
    let allowedLanguageEnums: string[] = [];

    if (user.userType === 'RADIO' && user.radioStationId) {
      const station = await prisma.station.findUnique({
        where: { id: user.radioStationId },
        select: { blockedCategories: true, allowedLanguages: true },
      });
      blockedCategories = station?.blockedCategories || [];
      allowedLanguageEnums = (station?.allowedLanguages || []).map(
        l => LANGUAGE_NAME_MAP[l] || l.toUpperCase()
      );
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
            parent: {
              select: {
                slug: true,
              },
            },
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

    // Dynamically inject children for News Bulletins and Speciality
    await injectDynamicChildren(menuTree, allowedLanguageEnums);

    const response = NextResponse.json({ menu: menuTree });
    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  },
  [withErrorHandling, withAuth]
);

export { getRadioMenu as GET };
