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
  BulletinScheduleType,
  BulletinStatus,
  MenuItemType,
  PodcastEpisodeStatus,
  EpisodeStatus,
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
// Podcast
// ---------------------------------------------------------------------------

interface CreateTestPodcastOptions {
  suffix: string;
  label: string;
  createdById: string;
  isPublished?: boolean;
  classificationIds?: string[];
}

export async function createTestPodcast(opts: CreateTestPodcastOptions) {
  const slug = testSlug(opts.suffix, opts.label);
  const podcast = await prisma.podcast.create({
    data: {
      title: `__test__${opts.suffix}_${opts.label}`,
      slug,
      description: `Test podcast ${opts.label}`,
      createdById: opts.createdById,
      isPublished: opts.isPublished ?? false,
      isActive: true,
    },
  });

  if (opts.classificationIds && opts.classificationIds.length > 0) {
    await prisma.podcastClassification.createMany({
      data: opts.classificationIds.map((cid) => ({
        podcastId: podcast.id,
        classificationId: cid,
      })),
    });
  }

  return podcast;
}

// ---------------------------------------------------------------------------
// Podcast Episode
// ---------------------------------------------------------------------------

interface CreateTestPodcastEpisodeOptions {
  suffix: string;
  label: string;
  podcastId: string;
  createdById: string;
  episodeNumber?: number;
  status?: PodcastEpisodeStatus;
}

export async function createTestPodcastEpisode(opts: CreateTestPodcastEpisodeOptions) {
  const slug = testSlug(opts.suffix, `pepisode_${opts.label}`);
  let episodeNumber = opts.episodeNumber;
  if (episodeNumber === undefined) {
    const last = await prisma.podcastEpisode.findFirst({
      where: { podcastId: opts.podcastId },
      orderBy: { episodeNumber: 'desc' },
    });
    episodeNumber = (last?.episodeNumber || 0) + 1;
  }

  return prisma.podcastEpisode.create({
    data: {
      title: `__test__${opts.suffix}_${opts.label}`,
      slug,
      podcastId: opts.podcastId,
      createdById: opts.createdById,
      episodeNumber,
      status: opts.status ?? 'DRAFT',
    },
  });
}

// ---------------------------------------------------------------------------
// Show
// ---------------------------------------------------------------------------

interface CreateTestShowOptions {
  suffix: string;
  label: string;
  createdById: string;
  isPublished?: boolean;
  parentId?: string;
  classificationIds?: string[];
}

export async function createTestShow(opts: CreateTestShowOptions) {
  const slug = testSlug(opts.suffix, opts.label);
  const show = await prisma.show.create({
    data: {
      title: `__test__${opts.suffix}_${opts.label}`,
      slug,
      description: `Test show ${opts.label}`,
      createdById: opts.createdById,
      isPublished: opts.isPublished ?? false,
      isActive: true,
      parentId: opts.parentId,
    },
  });

  if (opts.classificationIds && opts.classificationIds.length > 0) {
    await prisma.showClassification.createMany({
      data: opts.classificationIds.map((cid) => ({
        showId: show.id,
        classificationId: cid,
      })),
    });
  }

  return show;
}

// ---------------------------------------------------------------------------
// Show Episode
// ---------------------------------------------------------------------------

interface CreateTestShowEpisodeOptions {
  suffix: string;
  label: string;
  showId: string;
  createdById: string;
  episodeNumber?: number;
  status?: EpisodeStatus;
}

export async function createTestShowEpisode(opts: CreateTestShowEpisodeOptions) {
  const slug = testSlug(opts.suffix, `sepisode_${opts.label}`);
  let episodeNumber = opts.episodeNumber;
  if (episodeNumber === undefined) {
    const last = await prisma.episode.findFirst({
      where: { showId: opts.showId },
      orderBy: { episodeNumber: 'desc' },
    });
    episodeNumber = (last?.episodeNumber || 0) + 1;
  }

  return prisma.episode.create({
    data: {
      title: `__test__${opts.suffix}_${opts.label}`,
      slug,
      showId: opts.showId,
      createdById: opts.createdById,
      episodeNumber,
      status: opts.status ?? 'DRAFT',
    },
  });
}

// ---------------------------------------------------------------------------
// Audio Clip
// ---------------------------------------------------------------------------

export async function createTestAudioClip(suffix: string, label: string, uploadedById: string) {
  return prisma.audioClip.create({
    data: {
      filename: `__test__${suffix}_${label}.mp3`,
      originalName: `__test__${suffix}_${label}.mp3`,
      url: `https://test.example.com/__test__${suffix}_${label}.mp3`,
      mimeType: 'audio/mpeg',
      duration: 120,
      fileSize: 1024000,
      uploadedBy: uploadedById,
    },
  });
}

// ---------------------------------------------------------------------------
// Link audio to podcast episode
// ---------------------------------------------------------------------------

export async function linkAudioToPodcastEpisode(
  episodeId: string,
  audioClipId: string,
  addedById: string
) {
  return prisma.podcastEpisodeAudioClip.create({
    data: {
      episodeId,
      audioClipId,
      addedBy: addedById,
    },
  });
}

// ---------------------------------------------------------------------------
// Link audio to show episode
// ---------------------------------------------------------------------------

export async function linkAudioToShowEpisode(
  episodeId: string,
  audioClipId: string,
  addedById: string
) {
  return prisma.episodeAudioClip.create({
    data: {
      episodeId,
      audioClipId,
      addedBy: addedById,
    },
  });
}

// ---------------------------------------------------------------------------
// Bulletin Schedule
// ---------------------------------------------------------------------------

interface CreateTestBulletinScheduleOptions {
  suffix: string;
  label: string;
  createdById: string;
  time?: string;
  language?: StoryLanguage;
  scheduleType?: BulletinScheduleType;
}

export async function createTestBulletinSchedule(opts: CreateTestBulletinScheduleOptions) {
  return prisma.bulletinSchedule.create({
    data: {
      title: `__test__${opts.suffix}_${opts.label}`,
      time: opts.time ?? '09:00',
      language: opts.language ?? StoryLanguage.ENGLISH,
      scheduleType: opts.scheduleType ?? BulletinScheduleType.WEEKDAY,
      isActive: true,
      createdBy: opts.createdById,
    },
  });
}

// ---------------------------------------------------------------------------
// Bulletin
// ---------------------------------------------------------------------------

interface CreateTestBulletinOptions {
  suffix: string;
  label: string;
  authorId: string;
  categoryId: string;
  language?: StoryLanguage;
  status?: BulletinStatus;
  scheduleId?: string;
  reviewerId?: string;
}

export async function createTestBulletin(opts: CreateTestBulletinOptions) {
  const slug = testSlug(opts.suffix, opts.label);
  return prisma.bulletin.create({
    data: {
      title: `__test__${opts.suffix}_${opts.label}`,
      slug,
      intro: `Test intro for ${opts.label}`,
      outro: `Test outro for ${opts.label}`,
      language: opts.language ?? StoryLanguage.ENGLISH,
      status: opts.status ?? BulletinStatus.DRAFT,
      authorId: opts.authorId,
      categoryId: opts.categoryId,
      scheduleId: opts.scheduleId,
      reviewerId: opts.reviewerId,
    },
  });
}

// ---------------------------------------------------------------------------
// Menu Item
// ---------------------------------------------------------------------------

interface CreateTestMenuItemOptions {
  suffix: string;
  label: string;
  type: MenuItemType;
  parentId?: string;
  sortOrder?: number;
  categoryId?: string;
  showId?: string;
  podcastId?: string;
  url?: string;
  isVisible?: boolean;
}

export async function createTestMenuItem(opts: CreateTestMenuItemOptions) {
  return prisma.menuItem.create({
    data: {
      label: `__test__${opts.suffix}_${opts.label}`,
      type: opts.type,
      parentId: opts.parentId,
      sortOrder: opts.sortOrder ?? 0,
      categoryId: opts.categoryId,
      showId: opts.showId,
      podcastId: opts.podcastId,
      url: opts.url,
      isVisible: opts.isVisible ?? true,
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
  // 1. Menu items (children first due to self-referencing FK)
  const childMenuItems = await prisma.menuItem.findMany({
    where: {
      label: { startsWith: `__test__${suffix}_` },
      parentId: { not: null },
    },
    select: { id: true },
  });
  if (childMenuItems.length > 0) {
    await prisma.menuItem.deleteMany({
      where: { id: { in: childMenuItems.map((m) => m.id) } },
    });
  }
  await prisma.menuItem.deleteMany({
    where: { label: { startsWith: `__test__${suffix}_` } },
  });

  // Collect test user IDs for bulletin cleanup
  const bulletinTestUsers = await prisma.user.findMany({
    where: { email: { startsWith: `__test_${suffix}_` } },
    select: { id: true },
  });
  const bulletinTestUserIds = bulletinTestUsers.map((u) => u.id);

  // 2. Bulletin stories (depends on Bulletin + Story)
  const testBulletins = await prisma.bulletin.findMany({
    where: {
      OR: [
        { slug: { startsWith: `__test__${suffix}_` } },
        ...(bulletinTestUserIds.length > 0 ? [{ authorId: { in: bulletinTestUserIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const bulletinIds = testBulletins.map((b) => b.id);
  if (bulletinIds.length > 0) {
    await prisma.bulletinStory.deleteMany({
      where: { bulletinId: { in: bulletinIds } },
    });
  }

  // 3. Bulletins
  if (bulletinIds.length > 0) {
    await prisma.bulletin.deleteMany({
      where: { id: { in: bulletinIds } },
    });
  }

  // 4. Bulletin schedules
  await prisma.bulletinSchedule.deleteMany({
    where: { title: { startsWith: `__test__${suffix}_` } },
  });

  // Collect test user IDs early — needed to find API-created entities
  const testUsersEarly = await prisma.user.findMany({
    where: { email: { startsWith: `__test_${suffix}_` } },
    select: { id: true },
  });
  const testUserIds = testUsersEarly.map((u) => u.id);

  // 5. Podcast episode audio clips, then podcast episodes, then podcast classifications, then podcasts
  // Find by slug prefix OR by createdById (API-created entities won't have __test__ slugs)
  const testPodcasts = await prisma.podcast.findMany({
    where: {
      OR: [
        { slug: { startsWith: `__test__${suffix}_` } },
        ...(testUserIds.length > 0 ? [{ createdById: { in: testUserIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const podcastIds = testPodcasts.map((p) => p.id);
  if (podcastIds.length > 0) {
    const podcastEpisodes = await prisma.podcastEpisode.findMany({
      where: { podcastId: { in: podcastIds } },
      select: { id: true },
    });
    const podcastEpisodeIds = podcastEpisodes.map((e) => e.id);
    if (podcastEpisodeIds.length > 0) {
      await prisma.podcastEpisodeAudioClip.deleteMany({
        where: { episodeId: { in: podcastEpisodeIds } },
      });
      await prisma.podcastEpisode.deleteMany({
        where: { id: { in: podcastEpisodeIds } },
      });
    }
    await prisma.podcastClassification.deleteMany({
      where: { podcastId: { in: podcastIds } },
    });
    await prisma.podcastTag.deleteMany({
      where: { podcastId: { in: podcastIds } },
    });
    await prisma.podcast.deleteMany({
      where: { id: { in: podcastIds } },
    });
  }

  // 6. Show episode audio clips, then show episodes, then show classifications, then shows
  const testShows = await prisma.show.findMany({
    where: {
      OR: [
        { slug: { startsWith: `__test__${suffix}_` } },
        ...(testUserIds.length > 0 ? [{ createdById: { in: testUserIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const showIds = testShows.map((s) => s.id);
  if (showIds.length > 0) {
    const showEpisodes = await prisma.episode.findMany({
      where: { showId: { in: showIds } },
      select: { id: true },
    });
    const showEpisodeIds = showEpisodes.map((e) => e.id);
    if (showEpisodeIds.length > 0) {
      await prisma.episodeAudioClip.deleteMany({
        where: { episodeId: { in: showEpisodeIds } },
      });
      await prisma.episode.deleteMany({
        where: { id: { in: showEpisodeIds } },
      });
    }
    await prisma.showClassification.deleteMany({
      where: { showId: { in: showIds } },
    });
    await prisma.showTag.deleteMany({
      where: { showId: { in: showIds } },
    });
    // Delete sub-shows first (children), then parents
    await prisma.show.deleteMany({
      where: { id: { in: showIds }, parentId: { not: null } },
    });
    await prisma.show.deleteMany({
      where: { id: { in: showIds } },
    });
  }

  // 7. Audio clips (by filename prefix OR uploadedBy test users)
  await prisma.audioClip.deleteMany({
    where: {
      OR: [
        { filename: { startsWith: `__test__${suffix}_` } },
        ...(testUserIds.length > 0 ? [{ uploadedBy: { in: testUserIds } }] : []),
      ],
    },
  });

  // 8. StoryClassification join records
  const testStories = await prisma.story.findMany({
    where: { slug: { startsWith: `__test__${suffix}_` } },
    select: { id: true },
  });
  const storyIds = testStories.map((s) => s.id);

  if (storyIds.length > 0) {
    await prisma.storyClassification.deleteMany({
      where: { storyId: { in: storyIds } },
    });
    await prisma.revisionRequest.deleteMany({
      where: { storyId: { in: storyIds } },
    });
    await prisma.comment.deleteMany({
      where: { storyId: { in: storyIds } },
    });
    // Remove bulletin story links for test stories
    await prisma.bulletinStory.deleteMany({
      where: { storyId: { in: storyIds } },
    });
    await prisma.auditLog.deleteMany({
      where: {
        entityId: { in: storyIds },
        entityType: 'STORY',
      },
    });
  }

  // 9. Stories — translations first
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

  // 10. Classifications
  await prisma.classification.deleteMany({
    where: { slug: { startsWith: `__test__${suffix}_` } },
  });

  // 11. Categories (children first, then parents)
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

  // 12. Users (audit logs + diary entries first)
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: `__test_${suffix}_` } },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);

  if (userIds.length > 0) {
    await prisma.diaryEntry.deleteMany({
      where: {
        OR: [
          { createdById: { in: userIds } },
          { assignedToId: { in: userIds } },
        ],
      },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  // 13. Stations (after users that reference them)
  await prisma.station.deleteMany({
    where: { name: { startsWith: `__test__${suffix}_` } },
  });
}
