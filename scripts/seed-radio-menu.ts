import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Top-level CATEGORY items — label & labelAfrikaans pulled from the Category record
const categoryItems = [
  { categorySlug: 'news-stories', sortOrder: 1 },
  { categorySlug: 'sports', sortOrder: 3 },
  { categorySlug: 'finance', sortOrder: 4 },
];

// Top-level CUSTOM_LINK items — hardcoded labels
const customLinkItems = [
  { label: 'News Bulletins', labelAfrikaans: 'Nuusbulletins', url: '/radio/bulletins', sortOrder: 2 },
  { label: 'Speciality', labelAfrikaans: 'Spesialiteit', url: '/radio/shows', sortOrder: 5 },
];

async function main() {
  console.log('Seeding radio menu items...\n');

  // --- Step 1: Clean up any orphaned/stale menu items ---
  // Delete children whose parents no longer exist
  const allItems = await prisma.menuItem.findMany({ select: { id: true, parentId: true } });
  const allIds = new Set(allItems.map(i => i.id));
  const orphanIds = allItems.filter(i => i.parentId && !allIds.has(i.parentId)).map(i => i.id);
  if (orphanIds.length > 0) {
    await prisma.menuItem.deleteMany({ where: { id: { in: orphanIds } } });
    console.log(`Cleaned up ${orphanIds.length} orphaned menu items.`);
  }

  // --- Step 2: Upsert top-level CATEGORY items + seed their subcategory children ---
  for (const item of categoryItems) {
    const category = await prisma.category.findUnique({
      where: { slug: item.categorySlug },
    });

    if (!category) {
      console.log(`WARNING: Category "${item.categorySlug}" not found. Skipping.`);
      continue;
    }

    // Find or create the top-level menu item
    let menuItem = await prisma.menuItem.findFirst({
      where: { categoryId: category.id, parentId: null },
    });

    if (!menuItem) {
      menuItem = await prisma.menuItem.findFirst({
        where: { label: category.name, parentId: null },
      });
    }

    if (menuItem) {
      await prisma.menuItem.update({
        where: { id: menuItem.id },
        data: { sortOrder: item.sortOrder, categoryId: category.id },
      });
      console.log(`"${category.name}" already exists (id: ${menuItem.id}). Updated sortOrder to ${item.sortOrder}.`);
    } else {
      menuItem = await prisma.menuItem.create({
        data: {
          label: category.name,
          labelAfrikaans: category.nameAfrikaans,
          type: 'CATEGORY',
          categoryId: category.id,
          sortOrder: item.sortOrder,
          isVisible: true,
        },
      });
      console.log(`Created "${category.name}" menu item (id: ${menuItem.id}, sortOrder: ${item.sortOrder}).`);
    }

    // --- Seed subcategory children under this category ---
    // Delete existing children first to avoid stale items
    await prisma.menuItem.deleteMany({
      where: { parentId: menuItem.id },
    });

    const childCategories = await prisma.category.findMany({
      where: { parentId: category.id },
      orderBy: { name: 'asc' },
    });

    for (let i = 0; i < childCategories.length; i++) {
      const child = childCategories[i];
      await prisma.menuItem.create({
        data: {
          label: child.name,
          labelAfrikaans: child.nameAfrikaans,
          type: 'CATEGORY',
          categoryId: child.id,
          parentId: menuItem.id,
          sortOrder: i + 1,
          isVisible: true,
        },
      });
      console.log(`  Created subcategory menu: "${child.name}"`);
    }
  }

  // --- Step 3: Upsert top-level CUSTOM_LINK items ---
  for (const item of customLinkItems) {
    let existing = await prisma.menuItem.findFirst({
      where: { url: item.url, parentId: null },
    });

    if (!existing) {
      existing = await prisma.menuItem.findFirst({
        where: { label: item.label, parentId: null },
      });
    }

    // For Speciality, also check old label "Shows"
    if (!existing && item.label === 'Speciality') {
      existing = await prisma.menuItem.findFirst({
        where: { label: 'Shows', parentId: null },
      });
    }

    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          label: item.label,
          labelAfrikaans: item.labelAfrikaans,
          sortOrder: item.sortOrder,
          type: 'CUSTOM_LINK',
          url: item.url,
        },
      });
      console.log(`"${existing.label}" already exists (id: ${existing.id}). Updated to label="${item.label}", sortOrder=${item.sortOrder}.`);
    } else {
      await prisma.menuItem.create({
        data: {
          label: item.label,
          labelAfrikaans: item.labelAfrikaans,
          type: 'CUSTOM_LINK',
          url: item.url,
          openInNewTab: false,
          sortOrder: item.sortOrder,
          isVisible: true,
        },
      });
      console.log(`Created "${item.label}" menu item (sortOrder: ${item.sortOrder}).`);
    }
  }

  // --- Step 4: Bulletin schedule children under News Bulletins ---
  console.log('\nSeeding bulletin schedule menu children...');

  const bulletinsMenuItem = await prisma.menuItem.findFirst({
    where: { url: '/radio/bulletins', parentId: null },
  });

  if (bulletinsMenuItem) {
    // Clean up stale children
    await prisma.menuItem.deleteMany({
      where: { parentId: bulletinsMenuItem.id },
    });

    const schedules = await prisma.bulletinSchedule.findMany({
      where: { isActive: true },
      orderBy: { time: 'asc' },
    });

    // Deduplicate by time — one menu item per time slot (language handled by page filter)
    const seenTimes = new Map<string, typeof schedules[0]>();
    for (const schedule of schedules) {
      if (!seenTimes.has(schedule.time)) {
        seenTimes.set(schedule.time, schedule);
      }
    }

    const uniqueSchedules = Array.from(seenTimes.values());

    for (let i = 0; i < uniqueSchedules.length; i++) {
      const schedule = uniqueSchedules[i];
      // Strip language from title for display
      const label = `${schedule.time} - ${schedule.title.replace(/\b(English|Afrikaans|Xhosa|Zulu)\b\s*/i, '').trim()}`;
      const childUrl = `/radio/bulletins?scheduleId=${schedule.id}`;

      await prisma.menuItem.create({
        data: {
          label,
          type: 'CUSTOM_LINK',
          url: childUrl,
          openInNewTab: false,
          parentId: bulletinsMenuItem.id,
          sortOrder: i + 1,
          isVisible: true,
        },
      });
      console.log(`  Created schedule menu: "${label}"`);
    }
  } else {
    console.log('  WARNING: "News Bulletins" menu item not found. Skipping schedule children.');
  }

  // --- Step 5: Show children under Speciality ---
  console.log('\nSeeding show menu children under Speciality...');

  const specialityMenuItem = await prisma.menuItem.findFirst({
    where: { url: '/radio/shows', parentId: null },
  });

  if (specialityMenuItem) {
    // Clean up stale children
    await prisma.menuItem.deleteMany({
      where: { parentId: specialityMenuItem.id },
    });

    const shows = await prisma.show.findMany({
      where: {
        isActive: true,
        isPublished: true,
        parentId: null,
      },
      orderBy: { title: 'asc' },
    });

    for (let i = 0; i < shows.length; i++) {
      const show = shows[i];
      const childUrl = `/radio/shows?showId=${show.id}`;

      await prisma.menuItem.create({
        data: {
          label: show.title,
          type: 'CUSTOM_LINK',
          url: childUrl,
          openInNewTab: false,
          parentId: specialityMenuItem.id,
          sortOrder: i + 1,
          isVisible: true,
        },
      });
      console.log(`  Created show menu: "${show.title}"`);
    }
  } else {
    console.log('  WARNING: "Speciality" menu item not found. Skipping show children.');
  }

  // --- Summary ---
  const finalItems = await prisma.menuItem.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    include: {
      category: { select: { slug: true, parent: { select: { slug: true } } } },
    },
  });

  console.log('\nFinal radio menu:');
  for (const mi of finalItems) {
    let target: string;
    if (mi.type === 'CUSTOM_LINK') {
      target = mi.url || '#';
    } else if (mi.category) {
      const parentSlug = mi.category.parent?.slug;
      target = parentSlug ? `/radio/${parentSlug}/${mi.category.slug}` : `/radio/${mi.category.slug}`;
    } else {
      target = '#';
    }
    const indent = mi.parentId ? '    ' : '  ';
    const prefix = mi.parentId ? '└─ ' : '';
    console.log(`${indent}${prefix}${mi.sortOrder}. ${mi.label} (${mi.type}) -> ${target}`);
  }

  console.log('\nRadio menu seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
