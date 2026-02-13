import { PrismaClient, StaffRole } from '@prisma/client';

const prisma = new PrismaClient();

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function generateUniqueShowSlug(baseSlug: string): Promise<string> {
  const existingSlugs = await prisma.show.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });

  if (existingSlugs.length === 0) return baseSlug;

  const exactMatch = existingSlugs.some((s) => s.slug === baseSlug);
  if (!exactMatch) return baseSlug;

  const slugSet = new Set(existingSlugs.map((s) => s.slug));
  let counter = 1;

  for (const { slug } of existingSlugs) {
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= counter) counter = num + 1;
    }
  }

  let uniqueSlug = `${baseSlug}-${counter}`;
  while (slugSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

async function main() {
  console.log('Starting show migration...\n');

  // Get first SUPERADMIN user for createdById
  const superadmin = await prisma.user.findFirst({
    where: { staffRole: StaffRole.SUPERADMIN, isActive: true },
  });

  if (!superadmin) {
    throw new Error('No active SUPERADMIN user found. Cannot proceed.');
  }

  console.log(`Using SUPERADMIN: ${superadmin.email}\n`);

  // Step 1: Move Paperskoops & Goodskoops under News Stories
  console.log('--- Step 1: Move Paperskoops & Goodskoops to News Stories ---');

  const newsStoriesParent = await prisma.category.findUnique({
    where: { slug: 'news-stories' },
  });

  if (!newsStoriesParent) {
    console.log('WARNING: "News Stories" parent category not found. Skipping step 1.');
  } else {
    for (const slug of ['paperskoops', 'goodskoops']) {
      const cat = await prisma.category.findUnique({ where: { slug } });
      if (cat) {
        if (cat.parentId === newsStoriesParent.id) {
          console.log(`  "${cat.name}" already under News Stories. Skipping.`);
        } else {
          await prisma.category.update({
            where: { id: cat.id },
            data: { parentId: newsStoriesParent.id },
          });
          console.log(`  Moved "${cat.name}" under News Stories.`);
        }
      } else {
        console.log(`  Category "${slug}" not found. Skipping.`);
      }
    }
  }

  // Step 2: Reassign stories from Lifestyle/Agriskoops/Techskoops to News Stories
  console.log('\n--- Step 2: Reassign orphaned stories ---');

  const categoriesToConvert = ['lifestyle', 'agriskoops', 'techskoops'];
  for (const slug of categoriesToConvert) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (cat && newsStoriesParent) {
      const updated = await prisma.story.updateMany({
        where: { categoryId: cat.id },
        data: { categoryId: newsStoriesParent.id },
      });
      if (updated.count > 0) {
        console.log(`  Moved ${updated.count} stories from "${cat.name}" to News Stories.`);
      } else {
        console.log(`  No stories found in "${cat.name}".`);
      }
    }
  }

  // Step 3: Create Show records for Lifestyle, Agriskoops, Techskoops
  console.log('\n--- Step 3: Create Show records ---');

  const showsToCreate = [
    { title: 'Lifestyle', description: 'Lifestyle trends, health, and wellness' },
    { title: 'Agriskoops', description: 'Agricultural news and farming updates' },
    { title: 'Techskoops', description: 'Technology news and digital innovation' },
  ];

  for (const showData of showsToCreate) {
    const existingShow = await prisma.show.findFirst({
      where: { title: showData.title },
    });

    if (existingShow) {
      console.log(`  Show "${showData.title}" already exists. Skipping.`);
      continue;
    }

    const slug = await generateUniqueShowSlug(generateSlug(showData.title));
    await prisma.show.create({
      data: {
        title: showData.title,
        slug,
        description: showData.description,
        isPublished: true,
        isActive: true,
        createdById: superadmin.id,
      },
    });
    console.log(`  Created show: "${showData.title}" (slug: ${slug})`);
  }

  // Step 4: Create Sportskoops + sub-shows
  console.log('\n--- Step 4: Create Sportskoops with sub-shows ---');

  let sportskoops = await prisma.show.findFirst({
    where: { title: 'Sportskoops' },
  });

  if (sportskoops) {
    console.log('  Sportskoops already exists. Skipping parent creation.');
  } else {
    const slug = await generateUniqueShowSlug(generateSlug('Sportskoops'));
    sportskoops = await prisma.show.create({
      data: {
        title: 'Sportskoops',
        slug,
        description: 'Sports news, analysis, and coverage',
        isPublished: true,
        isActive: true,
        createdById: superadmin.id,
      },
    });
    console.log(`  Created parent show: "Sportskoops" (slug: ${slug})`);
  }

  const subShows = [
    { title: 'Rugby', description: 'Rugby news and match coverage' },
    { title: 'Cricket', description: 'Cricket news and match coverage' },
    { title: 'F1', description: 'Formula 1 racing news and updates' },
    { title: 'Soccer', description: 'Soccer news and match coverage' },
    { title: 'Tennis', description: 'Tennis news and tournament coverage' },
  ];

  for (const subShowData of subShows) {
    const existingSub = await prisma.show.findFirst({
      where: { title: subShowData.title, parentId: sportskoops.id },
    });

    if (existingSub) {
      console.log(`  Sub-show "${subShowData.title}" already exists. Skipping.`);
      continue;
    }

    const slug = await generateUniqueShowSlug(generateSlug(subShowData.title));
    await prisma.show.create({
      data: {
        title: subShowData.title,
        slug,
        description: subShowData.description,
        isPublished: true,
        isActive: true,
        createdById: superadmin.id,
        parentId: sportskoops.id,
      },
    });
    console.log(`  Created sub-show: "${subShowData.title}" (slug: ${slug})`);
  }

  // Step 5: Delete old categories (Lifestyle, Agriskoops, Techskoops, then Speciality)
  console.log('\n--- Step 5: Delete old Speciality categories ---');

  for (const slug of categoriesToConvert) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (cat) {
      // Check if any stories still reference this category
      const storyCount = await prisma.story.count({ where: { categoryId: cat.id } });
      if (storyCount > 0) {
        console.log(`  WARNING: ${storyCount} stories still reference "${cat.name}". Skipping delete.`);
        continue;
      }
      await prisma.category.delete({ where: { id: cat.id } });
      console.log(`  Deleted category: "${cat.name}"`);
    } else {
      console.log(`  Category "${slug}" not found (already deleted?). Skipping.`);
    }
  }

  // Delete Speciality parent if it has no remaining children
  const speciality = await prisma.category.findUnique({ where: { slug: 'speciality' } });
  if (speciality) {
    const childCount = await prisma.category.count({ where: { parentId: speciality.id } });
    if (childCount > 0) {
      console.log(`  WARNING: Speciality still has ${childCount} children. Skipping parent delete.`);
    } else {
      const storyCount = await prisma.story.count({ where: { categoryId: speciality.id } });
      if (storyCount > 0) {
        console.log(`  WARNING: ${storyCount} stories still reference Speciality. Skipping parent delete.`);
      } else {
        await prisma.category.delete({ where: { id: speciality.id } });
        console.log('  Deleted category: "Speciality"');
      }
    }
  } else {
    console.log('  Speciality category not found (already deleted?). Skipping.');
  }

  // Step 6: Rename Sports → Sports News
  console.log('\n--- Step 6: Rename Sports to Sports News ---');

  const sports = await prisma.category.findUnique({ where: { slug: 'sports' } });
  if (sports) {
    if (sports.name === 'Sports News') {
      console.log('  Already renamed to "Sports News". Skipping.');
    } else {
      await prisma.category.update({
        where: { id: sports.id },
        data: { name: 'Sports News' },
        // Keep slug as 'sports' to avoid breaking existing URL references
      });
      console.log('  Renamed "Sports" to "Sports News" (slug kept as "sports").');
    }
  } else {
    console.log('  "Sports" category not found. Skipping.');
  }

  // Step 7: Update radio menu items — remove Speciality, add Shows
  console.log('\n--- Step 7: Update radio menu items ---');

  // Find and delete Speciality menu item (linked to the deleted category)
  const specialityMenuItems = await prisma.menuItem.findMany({
    where: {
      OR: [
        { label: 'Speciality' },
        { category: { slug: 'speciality' } },
      ],
    },
  });

  for (const item of specialityMenuItems) {
    // Delete children first
    await prisma.menuItem.deleteMany({ where: { parentId: item.id } });
    await prisma.menuItem.delete({ where: { id: item.id } });
    console.log(`  Deleted menu item: "${item.label}"`);
  }

  // Update Sports menu item label if it exists
  const sportsMenuItems = await prisma.menuItem.findMany({
    where: {
      OR: [
        { label: 'Sports' },
        { category: { slug: 'sports' } },
      ],
    },
  });

  for (const item of sportsMenuItems) {
    if (item.label !== 'Sports News') {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: { label: 'Sports News' },
      });
      console.log(`  Renamed menu item "Sports" to "Sports News".`);
    }
  }

  // Add a Shows menu item if it doesn't exist
  const existingShowsMenuItem = await prisma.menuItem.findFirst({
    where: { label: 'Shows' },
  });

  if (existingShowsMenuItem) {
    console.log('  "Shows" menu item already exists. Skipping.');
  } else {
    // Get the max sort order to place Shows at the end
    const maxSortItem = await prisma.menuItem.findFirst({
      where: { parentId: null },
      orderBy: { sortOrder: 'desc' },
    });
    const nextSortOrder = (maxSortItem?.sortOrder ?? 0) + 1;

    await prisma.menuItem.create({
      data: {
        label: 'Shows',
        labelAfrikaans: 'Programme',
        type: 'CUSTOM_LINK',
        url: '/radio/shows',
        openInNewTab: false,
        sortOrder: nextSortOrder,
        isVisible: true,
      },
    });
    console.log(`  Created "Shows" menu item (sort order: ${nextSortOrder}).`);
  }

  console.log('\nShow migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
