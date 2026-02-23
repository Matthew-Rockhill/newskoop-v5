import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CATEGORY items — label & labelAfrikaans pulled from the Category record
const categoryItems = [
  { categorySlug: 'news-stories', sortOrder: 1 },
  { categorySlug: 'sports', sortOrder: 3 },
  { categorySlug: 'finance', sortOrder: 4 },
];

// CUSTOM_LINK items — hardcoded labels
const customLinkItems = [
  { label: 'News Bulletins', labelAfrikaans: 'Nuusbulletins', url: '/radio/bulletins', sortOrder: 2 },
  { label: 'Speciality', labelAfrikaans: 'Spesialiteit', url: '/radio/shows', sortOrder: 5 },
];

async function main() {
  console.log('Seeding radio menu items...\n');

  // --- CATEGORY items (no subcategory children — stories use tags, not child categories) ---
  for (const item of categoryItems) {
    const category = await prisma.category.findUnique({
      where: { slug: item.categorySlug },
    });

    if (!category) {
      console.log(`WARNING: Category "${item.categorySlug}" not found. Skipping.`);
      continue;
    }

    // Check if a menu item already exists for this category
    let existing = await prisma.menuItem.findFirst({
      where: { categoryId: category.id, parentId: null },
    });

    // Also check by label match
    if (!existing) {
      existing = await prisma.menuItem.findFirst({
        where: { label: category.name, parentId: null },
      });
    }

    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: { sortOrder: item.sortOrder },
      });
      console.log(`"${category.name}" already exists (id: ${existing.id}). Updated sortOrder to ${item.sortOrder}.`);
    } else {
      const created = await prisma.menuItem.create({
        data: {
          label: category.name,
          labelAfrikaans: category.nameAfrikaans,
          type: 'CATEGORY',
          categoryId: category.id,
          sortOrder: item.sortOrder,
          isVisible: true,
        },
      });
      console.log(`Created "${category.name}" menu item (id: ${created.id}, sortOrder: ${item.sortOrder}).`);
    }
  }

  // --- CUSTOM_LINK items ---
  for (const item of customLinkItems) {
    // Check by url match first
    let existing = await prisma.menuItem.findFirst({
      where: { url: item.url, parentId: null },
    });

    // Check by label match
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
        },
      });
      console.log(`"${existing.label}" already exists (id: ${existing.id}). Updated to label="${item.label}", sortOrder=${item.sortOrder}.`);
    } else {
      const created = await prisma.menuItem.create({
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
      console.log(`Created "${item.label}" menu item (id: ${created.id}, sortOrder: ${item.sortOrder}).`);
    }
  }

  // --- Bulletin schedule children (deduplicated by time, language handled by page filter) ---
  console.log('\nSeeding bulletin schedule menu children...');

  const bulletinsMenuItem = await prisma.menuItem.findFirst({
    where: { url: '/radio/bulletins', parentId: null },
  });

  if (bulletinsMenuItem) {
    // Clean up any stale schedule children first
    await prisma.menuItem.deleteMany({
      where: { parentId: bulletinsMenuItem.id },
    });

    const schedules = await prisma.bulletinSchedule.findMany({
      where: { isActive: true },
      orderBy: { time: 'asc' },
    });

    // Deduplicate by time — pick one schedule per time slot
    const seenTimes = new Map<string, typeof schedules[0]>();
    for (const schedule of schedules) {
      if (!seenTimes.has(schedule.time)) {
        seenTimes.set(schedule.time, schedule);
      }
    }

    const uniqueSchedules = Array.from(seenTimes.values());

    for (let i = 0; i < uniqueSchedules.length; i++) {
      const schedule = uniqueSchedules[i];
      // Strip language from title for display (e.g. "8:00 English News" -> just use time)
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

  // --- Show children under Speciality ---
  console.log('\nSeeding show menu children under Speciality...');

  const specialityMenuItem = await prisma.menuItem.findFirst({
    where: { url: '/radio/shows', parentId: null },
  });

  if (specialityMenuItem) {
    // Clean up any stale show children first
    await prisma.menuItem.deleteMany({
      where: { parentId: specialityMenuItem.id },
    });

    // Get all top-level published shows
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
  const allItems = await prisma.menuItem.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    select: { id: true, label: true, type: true, sortOrder: true, url: true, categoryId: true, parentId: true },
  });

  console.log('\nFinal radio menu:');
  for (const mi of allItems) {
    const target = mi.type === 'CUSTOM_LINK' ? mi.url : `category:${mi.categoryId}`;
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
