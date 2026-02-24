/**
 * Integration Test Helpers
 *
 * Shared setup/cleanup utilities for integration tests that run against
 * the real development database via real HTTP endpoints. All entities
 * use identifiable prefixes (__test__) and unique suffixes to avoid collisions.
 */

import { prisma } from '@/lib/prisma';
import { encode } from 'next-auth/jwt';
import {
  StaffRole,
  UserType,
  StoryStage,
  StoryStatus,
  StoryLanguage,
  ClassificationType,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BASE_URL = 'http://localhost:3099';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function testEmail(suffix: string, label: string) {
  return `__test_${suffix}_${label}@test.newskoop.internal`;
}

function testSlug(suffix: string, label: string) {
  return `__test__${suffix}_${label}_${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Session Cookie (JWE via next-auth/jwt encode)
// ---------------------------------------------------------------------------

export async function createSessionCookie(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  staffRole?: string | null;
  radioStationId?: string | null;
}) {
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      staffRole: user.staffRole ?? null,
      radioStationId: user.radioStationId ?? null,
    },
    secret: process.env.NEXTAUTH_SECRET!,
  });
  return `next-auth.session-token=${token}`;
}

// ---------------------------------------------------------------------------
// API Fetch wrapper
// ---------------------------------------------------------------------------

export async function apiFetch(
  path: string,
  cookie: string,
  opts: RequestInit = {}
) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      ...opts.headers,
    },
  });
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export async function createTestUser(
  role: StaffRole,
  suffix: string,
  label: string = role.toLowerCase()
) {
  return prisma.user.create({
    data: {
      email: testEmail(suffix, label),
      firstName: '__test__',
      lastName: `${role}_${suffix}`,
      password: '__test__hashed_password',
      userType: UserType.STAFF,
      staffRole: role,
      isActive: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Radio User (attached to a station)
// ---------------------------------------------------------------------------

export async function createTestRadioUser(
  suffix: string,
  stationId: string,
  label: string = 'radio'
) {
  return prisma.user.create({
    data: {
      email: testEmail(suffix, label),
      firstName: '__test__',
      lastName: `RADIO_${suffix}`,
      password: '__test__hashed_password',
      userType: UserType.RADIO,
      radioStationId: stationId,
      isActive: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export async function createTestCategory(
  name: string,
  suffix: string,
  parentId?: string
) {
  const fullName = `__test__${suffix}_${name}`;
  return prisma.category.create({
    data: {
      name: fullName,
      slug: fullName.toLowerCase().replace(/\s+/g, '-'),
      level: parentId ? 2 : 1,
      isParent: !parentId,
      parentId: parentId ?? undefined,
    },
  });
}

// ---------------------------------------------------------------------------
// Classification (Language / Religion / Locality)
// ---------------------------------------------------------------------------

export async function createTestClassification(
  name: string,
  type: ClassificationType,
  suffix: string
) {
  const fullName = `__test__${suffix}_${name}`;
  return prisma.classification.create({
    data: {
      name: fullName,
      slug: fullName.toLowerCase().replace(/\s+/g, '-'),
      type,
      isActive: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

interface CreateTestStoryOptions {
  title?: string;
  suffix: string;
  label: string;
  authorId: string;
  authorRole?: StaffRole;
  stage?: StoryStage;
  status?: StoryStatus;
  categoryId?: string;
  language?: StoryLanguage;
  isTranslation?: boolean;
  originalStoryId?: string;
  classificationIds?: string[];
  publishedAt?: Date;
}

export async function createTestStory(opts: CreateTestStoryOptions) {
  const slug = testSlug(opts.suffix, opts.label);
  const story = await prisma.story.create({
    data: {
      title: opts.title ?? `__test__${opts.suffix}_${opts.label}`,
      slug,
      content: `<p>Test story content for ${opts.label}</p>`,
      status: opts.status ?? StoryStatus.DRAFT,
      stage: opts.stage ?? StoryStage.DRAFT,
      authorRole: opts.authorRole,
      language: opts.language ?? StoryLanguage.ENGLISH,
      isTranslation: opts.isTranslation ?? false,
      originalStoryId: opts.originalStoryId,
      authorId: opts.authorId,
      categoryId: opts.categoryId,
      publishedAt: opts.publishedAt,
    },
  });

  // Link classifications via the join table
  if (opts.classificationIds && opts.classificationIds.length > 0) {
    await prisma.storyClassification.createMany({
      data: opts.classificationIds.map((cid) => ({
        storyId: story.id,
        classificationId: cid,
      })),
    });
  }

  return story;
}

// ---------------------------------------------------------------------------
// Station
// ---------------------------------------------------------------------------

interface CreateTestStationOptions {
  suffix: string;
  label: string;
  allowedLanguages?: string[];
  allowedReligions?: string[];
  blockedCategories?: string[];
}

export async function createTestStation(opts: CreateTestStationOptions) {
  return prisma.station.create({
    data: {
      name: `__test__${opts.suffix}_${opts.label}`,
      allowedLanguages: opts.allowedLanguages ?? [],
      allowedReligions: opts.allowedReligions ?? [],
      blockedCategories: opts.blockedCategories ?? [],
      isActive: true,
      hasContentAccess: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Cleanup (dependency-ordered delete)
// ---------------------------------------------------------------------------

/**
 * Delete all test entities created with the given suffix.
 * Runs deletes in dependency order so FK constraints are respected.
 */
export async function cleanupTestData(suffix: string) {
  // 1. StoryClassification join records (depends on Story + Classification)
  //    Delete for stories whose slug matches the test pattern
  const testStories = await prisma.story.findMany({
    where: { slug: { startsWith: `__test__${suffix}_` } },
    select: { id: true },
  });
  const storyIds = testStories.map((s) => s.id);

  if (storyIds.length > 0) {
    await prisma.storyClassification.deleteMany({
      where: { storyId: { in: storyIds } },
    });

    // 2a. Revision requests on test stories
    await prisma.revisionRequest.deleteMany({
      where: { storyId: { in: storyIds } },
    });

    // 2b. Comments on test stories
    await prisma.comment.deleteMany({
      where: { storyId: { in: storyIds } },
    });

    // 2c. Audit logs referencing test stories
    await prisma.auditLog.deleteMany({
      where: {
        entityId: { in: storyIds },
        entityType: 'STORY',
      },
    });
  }

  // 3. Stories — translations first (they reference parent via originalStoryId)
  if (storyIds.length > 0) {
    await prisma.story.deleteMany({
      where: {
        id: { in: storyIds },
        isTranslation: true,
      },
    });
    await prisma.story.deleteMany({
      where: {
        id: { in: storyIds },
      },
    });
  }

  // 4. Classifications
  await prisma.classification.deleteMany({
    where: { slug: { startsWith: `__test__${suffix}_` } },
  });

  // 5. Categories (children first, then parents)
  await prisma.category.deleteMany({
    where: {
      name: { startsWith: `__test__${suffix}_` },
      level: 2,
    },
  });
  await prisma.category.deleteMany({
    where: {
      name: { startsWith: `__test__${suffix}_` },
    },
  });

  // 6. Users (audit logs first, then users — must come before stations for FK)
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: `__test_${suffix}_` } },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);

  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  // 7. Stations (after users that reference them)
  await prisma.station.deleteMany({
    where: { name: { startsWith: `__test__${suffix}_` } },
  });
}
