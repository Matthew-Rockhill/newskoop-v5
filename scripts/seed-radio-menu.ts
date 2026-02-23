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

  // --- CATEGORY items ---
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
      // Update sortOrder to ensure correct ordering
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

  // --- Summary ---
  const allItems = await prisma.menuItem.findMany({
    where: { parentId: null, isVisible: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, label: true, type: true, sortOrder: true, url: true, categoryId: true },
  });

  console.log('\nFinal radio menu:');
  for (const mi of allItems) {
    const target = mi.type === 'CUSTOM_LINK' ? mi.url : `category:${mi.categoryId}`;
    console.log(`  ${mi.sortOrder}. ${mi.label} (${mi.type}) -> ${target}`);
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
