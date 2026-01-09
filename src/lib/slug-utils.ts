import { prisma } from '@/lib/prisma';

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Generate a unique slug for a story
 * Optimized: Single query instead of unbounded loop
 * @param baseSlug - The base slug to make unique
 * @param excludeId - Optional story ID to exclude (for updates)
 */
export async function generateUniqueStorySlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  // Find all existing slugs that start with the base slug
  const existingSlugs = await prisma.story.findMany({
    where: {
      slug: { startsWith: baseSlug },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });

  if (existingSlugs.length === 0) {
    return baseSlug;
  }

  // Check if exact base slug exists
  const exactMatch = existingSlugs.some((s) => s.slug === baseSlug);
  if (!exactMatch) {
    return baseSlug;
  }

  // Find the highest counter suffix
  const slugSet = new Set(existingSlugs.map((s) => s.slug));
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  // Find max counter from existing slugs
  for (const { slug } of existingSlugs) {
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= counter) {
        counter = num + 1;
      }
    }
  }

  uniqueSlug = `${baseSlug}-${counter}`;

  // Verify it doesn't exist (edge case safety)
  while (slugSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Generate a unique slug for a category
 * Optimized: Single query instead of unbounded loop
 */
export async function generateUniqueCategorySlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const existingSlugs = await prisma.category.findMany({
    where: {
      slug: { startsWith: baseSlug },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });

  if (existingSlugs.length === 0) {
    return baseSlug;
  }

  const exactMatch = existingSlugs.some((s) => s.slug === baseSlug);
  if (!exactMatch) {
    return baseSlug;
  }

  const slugSet = new Set(existingSlugs.map((s) => s.slug));
  let counter = 1;

  for (const { slug } of existingSlugs) {
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= counter) {
        counter = num + 1;
      }
    }
  }

  let uniqueSlug = `${baseSlug}-${counter}`;
  while (slugSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Generate a unique slug for a bulletin
 * Optimized: Single query instead of unbounded loop
 */
export async function generateUniqueBulletinSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const existingSlugs = await prisma.bulletin.findMany({
    where: {
      slug: { startsWith: baseSlug },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });

  if (existingSlugs.length === 0) {
    return baseSlug;
  }

  const exactMatch = existingSlugs.some((s) => s.slug === baseSlug);
  if (!exactMatch) {
    return baseSlug;
  }

  const slugSet = new Set(existingSlugs.map((s) => s.slug));
  let counter = 1;

  for (const { slug } of existingSlugs) {
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= counter) {
        counter = num + 1;
      }
    }
  }

  let uniqueSlug = `${baseSlug}-${counter}`;
  while (slugSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Generate a unique slug for a show
 * Optimized: Single query instead of unbounded loop
 */
export async function generateUniqueShowSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const existingSlugs = await prisma.show.findMany({
    where: {
      slug: { startsWith: baseSlug },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });

  if (existingSlugs.length === 0) {
    return baseSlug;
  }

  const exactMatch = existingSlugs.some((s) => s.slug === baseSlug);
  if (!exactMatch) {
    return baseSlug;
  }

  const slugSet = new Set(existingSlugs.map((s) => s.slug));
  let counter = 1;

  for (const { slug } of existingSlugs) {
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= counter) {
        counter = num + 1;
      }
    }
  }

  let uniqueSlug = `${baseSlug}-${counter}`;
  while (slugSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Generate a unique slug for a tag
 * Optimized: Single query instead of unbounded loop
 */
export async function generateUniqueTagSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const existingSlugs = await prisma.tag.findMany({
    where: {
      slug: { startsWith: baseSlug },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });

  if (existingSlugs.length === 0) {
    return baseSlug;
  }

  const exactMatch = existingSlugs.some((s) => s.slug === baseSlug);
  if (!exactMatch) {
    return baseSlug;
  }

  const slugSet = new Set(existingSlugs.map((s) => s.slug));
  let counter = 1;

  for (const { slug } of existingSlugs) {
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= counter) {
        counter = num + 1;
      }
    }
  }

  let uniqueSlug = `${baseSlug}-${counter}`;
  while (slugSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Generate a unique slug for a classification
 * Optimized: Single query instead of unbounded loop
 */
export async function generateUniqueClassificationSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const existingSlugs = await prisma.classification.findMany({
    where: {
      slug: { startsWith: baseSlug },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });

  if (existingSlugs.length === 0) {
    return baseSlug;
  }

  const exactMatch = existingSlugs.some((s) => s.slug === baseSlug);
  if (!exactMatch) {
    return baseSlug;
  }

  const slugSet = new Set(existingSlugs.map((s) => s.slug));
  let counter = 1;

  for (const { slug } of existingSlugs) {
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= counter) {
        counter = num + 1;
      }
    }
  }

  let uniqueSlug = `${baseSlug}-${counter}`;
  while (slugSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Generate a unique slug for an episode
 * Optimized: Single query instead of unbounded loop
 */
export async function generateUniqueEpisodeSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const existingSlugs = await prisma.episode.findMany({
    where: {
      slug: { startsWith: baseSlug },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });

  if (existingSlugs.length === 0) {
    return baseSlug;
  }

  const exactMatch = existingSlugs.some((s) => s.slug === baseSlug);
  if (!exactMatch) {
    return baseSlug;
  }

  const slugSet = new Set(existingSlugs.map((s) => s.slug));
  let counter = 1;

  for (const { slug } of existingSlugs) {
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= counter) {
        counter = num + 1;
      }
    }
  }

  let uniqueSlug = `${baseSlug}-${counter}`;
  while (slugSet.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}
