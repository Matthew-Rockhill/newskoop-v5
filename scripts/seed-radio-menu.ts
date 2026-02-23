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

  // --- CATEGORY items + their subcategory children ---
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

    let parentMenuItemId: string;

    if (existing) {
      // Update sortOrder to ensure correct ordering
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: { sortOrder: item.sortOrder },
      });
      parentMenuItemId = existing.id;
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
      parentMenuItemId = created.id;
      console.log(`Created "${category.name}" menu item (id: ${created.id}, sortOrder: ${item.sortOrder}).`);
    }

    // --- Seed child menu items for subcategories ---
    const subcategories = await prisma.category.findMany({
      where: { parentId: category.id },
      orderBy: { name: 'asc' },
    });

    for (let i = 0; i < subcategories.length; i++) {
      const sub = subcategories[i];

      // Check if a child menu item already exists for this subcategory
      let existingChild = await prisma.menuItem.findFirst({
        where: { categoryId: sub.id, parentId: parentMenuItemId },
      });

      // Also check by label + parentId
      if (!existingChild) {
        existingChild = await prisma.menuItem.findFirst({
          where: { label: sub.name, parentId: parentMenuItemId },
        });
      }

      if (existingChild) {
        await prisma.menuItem.update({
          where: { id: existingChild.id },
          data: { sortOrder: i + 1 },
        });
        console.log(`  Sub: "${sub.name}" already exists. Updated sortOrder to ${i + 1}.`);
      } else {
        const createdChild = await prisma.menuItem.create({
          data: {
            label: sub.name,
            labelAfrikaans: sub.nameAfrikaans,
            type: 'CATEGORY',
            categoryId: sub.id,
            parentId: parentMenuItemId,
            sortOrder: i + 1,
            isVisible: true,
          },
        });
        console.log(`  Created sub-menu: "${sub.name}" (id: ${createdChild.id}, parent: ${category.name}).`);
      }
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
      // Update label, labelAfrikaans, and sortOrder (renames "Shows" -> "Speciality" if needed)
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

  // --- Bulletin schedule children under News Bulletins ---
  console.log('\nSeeding bulletin schedule menu children...');

  const bulletinsMenuItem = await prisma.menuItem.findFirst({
    where: { url: '/radio/bulletins', parentId: null },
  });

  if (bulletinsMenuItem) {
    const schedules = await prisma.bulletinSchedule.findMany({
      where: { isActive: true },
      orderBy: { time: 'asc' },
    });

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      const childUrl = `/radio/bulletins?scheduleId=${schedule.id}`;

      // Check if child already exists by url
      let existingChild = await prisma.menuItem.findFirst({
        where: { url: childUrl, parentId: bulletinsMenuItem.id },
      });

      // Also check by label
      if (!existingChild) {
        existingChild = await prisma.menuItem.findFirst({
          where: { label: schedule.title, parentId: bulletinsMenuItem.id },
        });
      }

      if (existingChild) {
        await prisma.menuItem.update({
          where: { id: existingChild.id },
          data: { sortOrder: i + 1, url: childUrl, label: schedule.title },
        });
        console.log(`  Schedule: "${schedule.title}" already exists. Updated sortOrder to ${i + 1}.`);
      } else {
        const createdChild = await prisma.menuItem.create({
          data: {
            label: schedule.title,
            type: 'CUSTOM_LINK',
            url: childUrl,
            openInNewTab: false,
            parentId: bulletinsMenuItem.id,
            sortOrder: i + 1,
            isVisible: true,
          },
        });
        console.log(`  Created schedule menu: "${schedule.title}" (id: ${createdChild.id}).`);
      }
    }
  } else {
    console.log('  WARNING: "News Bulletins" menu item not found. Skipping schedule children.');
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
