/**
 * Station Content Filtering — Integration Tests
 *
 * Verifies that the Prisma query logic used by /api/radio/stories correctly
 * filters PUBLISHED stories by language classifications, religion
 * classifications, and blocked categories.
 *
 * Uses the real dev database; all test entities are prefixed with __test__
 * and cleaned up in afterAll.
 */

import { prisma } from '@/lib/prisma';
import { ClassificationType, StoryStage, StoryStatus, StoryLanguage } from '@prisma/client';
import {
  createTestUser,
  createTestCategory,
  createTestClassification,
  createTestStory,
  cleanupTestData,
} from './test-helpers';

const SUFFIX = 'sf'; // station-filtering

// Shared references populated in beforeAll
let authorId: string;
let englishId: string;
let xhosaId: string;
let christianId: string;
let muslimId: string;
let newsCatId: string;
let sportsCatId: string;
let storyA: { id: string }; // English + Christian + news
let storyB: { id: string }; // Xhosa  + Christian + news
let storyC: { id: string }; // English + Muslim   + sports
let storyD: { id: string }; // Xhosa  + Muslim   + sports
let draftStory: { id: string }; // DRAFT (not published)

// ---------------------------------------------------------------------------
// Replicates the filtering query from /api/radio/stories (route.ts)
// ---------------------------------------------------------------------------

async function queryStoriesForStation(opts: {
  allowedLanguageNames: string[];
  allowedReligionNames: string[];
  blockedCategoryIds: string[];
}) {
  // Step 1: Resolve classification IDs (mirrors route.ts lines 102-123)
  const [languageClassifications, religionClassifications] = await Promise.all([
    prisma.classification.findMany({
      where: {
        type: ClassificationType.LANGUAGE,
        isActive: true,
        name: { in: opts.allowedLanguageNames },
      },
      select: { id: true },
    }),
    prisma.classification.findMany({
      where: {
        type: ClassificationType.RELIGION,
        isActive: true,
        name: { in: opts.allowedReligionNames },
      },
      select: { id: true },
    }),
  ]);

  const langIds = languageClassifications.map((c) => c.id);
  const relIds = religionClassifications.map((c) => c.id);

  // Step 2: Build where clause (mirrors route.ts lines 127-202)
  const sharedWhere = {
    stage: 'PUBLISHED' as const,
    categoryId: {
      notIn: opts.blockedCategoryIds,
    },
    AND: [
      {
        classifications: {
          some: { classificationId: { in: langIds } },
        },
      },
      {
        classifications: {
          some: { classificationId: { in: relIds } },
        },
      },
    ],
  };

  const stories = await prisma.story.findMany({
    where: sharedWhere,
    select: { id: true, title: true },
    orderBy: { publishedAt: 'desc' },
  });

  return stories;
}

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Cleanup any leftover data from previous aborted run
  await cleanupTestData(SUFFIX);

  // Create shared fixtures
  const author = await createTestUser('JOURNALIST', SUFFIX, 'author');
  authorId = author.id;

  const english = await createTestClassification('English', ClassificationType.LANGUAGE, SUFFIX);
  const xhosa = await createTestClassification('Xhosa', ClassificationType.LANGUAGE, SUFFIX);
  const christian = await createTestClassification('Christian', ClassificationType.RELIGION, SUFFIX);
  const muslim = await createTestClassification('Muslim', ClassificationType.RELIGION, SUFFIX);

  englishId = english.id;
  xhosaId = xhosa.id;
  christianId = christian.id;
  muslimId = muslim.id;

  const newsCat = await createTestCategory('news', SUFFIX);
  const sportsCat = await createTestCategory('sports', SUFFIX);
  newsCatId = newsCat.id;
  sportsCatId = sportsCat.id;

  // Create 4 PUBLISHED stories with different classification combos
  storyA = await createTestStory({
    suffix: SUFFIX,
    label: 'storyA',
    authorId,
    stage: StoryStage.PUBLISHED,
    status: StoryStatus.PUBLISHED,
    categoryId: newsCatId,
    classificationIds: [englishId, christianId],
    publishedAt: new Date('2026-01-01'),
  });

  storyB = await createTestStory({
    suffix: SUFFIX,
    label: 'storyB',
    authorId,
    stage: StoryStage.PUBLISHED,
    status: StoryStatus.PUBLISHED,
    categoryId: newsCatId,
    classificationIds: [xhosaId, christianId],
    publishedAt: new Date('2026-01-02'),
  });

  storyC = await createTestStory({
    suffix: SUFFIX,
    label: 'storyC',
    authorId,
    stage: StoryStage.PUBLISHED,
    status: StoryStatus.PUBLISHED,
    categoryId: sportsCatId,
    classificationIds: [englishId, muslimId],
    publishedAt: new Date('2026-01-03'),
  });

  storyD = await createTestStory({
    suffix: SUFFIX,
    label: 'storyD',
    authorId,
    stage: StoryStage.PUBLISHED,
    status: StoryStatus.PUBLISHED,
    categoryId: sportsCatId,
    classificationIds: [xhosaId, muslimId],
    publishedAt: new Date('2026-01-04'),
  });

  // Also create a DRAFT story to verify it is excluded
  draftStory = await createTestStory({
    suffix: SUFFIX,
    label: 'draft',
    authorId,
    stage: StoryStage.DRAFT,
    status: StoryStatus.DRAFT,
    categoryId: newsCatId,
    classificationIds: [englishId, christianId],
  });
}, 30000);

afterAll(async () => {
  await cleanupTestData(SUFFIX);
}, 30000);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Station Content Filtering (Integration)', () => {
  it('returns only PUBLISHED stories', async () => {
    const results = await queryStoriesForStation({
      allowedLanguageNames: [`__test__${SUFFIX}_English`, `__test__${SUFFIX}_Xhosa`],
      allowedReligionNames: [`__test__${SUFFIX}_Christian`, `__test__${SUFFIX}_Muslim`],
      blockedCategoryIds: [],
    });

    const ids = results.map((r) => r.id);
    expect(ids).toContain(storyA.id);
    expect(ids).toContain(storyB.id);
    expect(ids).toContain(storyC.id);
    expect(ids).toContain(storyD.id);
    expect(ids).not.toContain(draftStory.id);
  });

  it('filters by language — English only', async () => {
    const results = await queryStoriesForStation({
      allowedLanguageNames: [`__test__${SUFFIX}_English`],
      allowedReligionNames: [`__test__${SUFFIX}_Christian`, `__test__${SUFFIX}_Muslim`],
      blockedCategoryIds: [],
    });

    const ids = results.map((r) => r.id);
    expect(ids).toContain(storyA.id);
    expect(ids).toContain(storyC.id);
    expect(ids).not.toContain(storyB.id);
    expect(ids).not.toContain(storyD.id);
  });

  it('filters by religion — Christian only', async () => {
    const results = await queryStoriesForStation({
      allowedLanguageNames: [`__test__${SUFFIX}_English`, `__test__${SUFFIX}_Xhosa`],
      allowedReligionNames: [`__test__${SUFFIX}_Christian`],
      blockedCategoryIds: [],
    });

    const ids = results.map((r) => r.id);
    expect(ids).toContain(storyA.id);
    expect(ids).toContain(storyB.id);
    expect(ids).not.toContain(storyC.id);
    expect(ids).not.toContain(storyD.id);
  });

  it('requires BOTH language AND religion match', async () => {
    const results = await queryStoriesForStation({
      allowedLanguageNames: [`__test__${SUFFIX}_English`],
      allowedReligionNames: [`__test__${SUFFIX}_Christian`],
      blockedCategoryIds: [],
    });

    const ids = results.map((r) => r.id);
    expect(ids).toContain(storyA.id);
    expect(ids).not.toContain(storyB.id); // Xhosa
    expect(ids).not.toContain(storyC.id); // Muslim
    expect(ids).not.toContain(storyD.id); // Xhosa + Muslim
  });

  it('excludes blocked categories', async () => {
    const results = await queryStoriesForStation({
      allowedLanguageNames: [`__test__${SUFFIX}_English`, `__test__${SUFFIX}_Xhosa`],
      allowedReligionNames: [`__test__${SUFFIX}_Christian`, `__test__${SUFFIX}_Muslim`],
      blockedCategoryIds: [sportsCatId],
    });

    const ids = results.map((r) => r.id);
    expect(ids).toContain(storyA.id);
    expect(ids).toContain(storyB.id);
    expect(ids).not.toContain(storyC.id); // sports
    expect(ids).not.toContain(storyD.id); // sports
  });

  it('handles empty classification matches — returns no stories', async () => {
    const results = await queryStoriesForStation({
      allowedLanguageNames: [`__test__${SUFFIX}_Afrikaans`], // no stories have this
      allowedReligionNames: [`__test__${SUFFIX}_Christian`, `__test__${SUFFIX}_Muslim`],
      blockedCategoryIds: [],
    });

    // No test stories should match (though other DB stories could — filter by our IDs)
    const testIds = [storyA.id, storyB.id, storyC.id, storyD.id];
    const matchedTestIds = results.filter((r) => testIds.includes(r.id));
    expect(matchedTestIds).toHaveLength(0);
  });
});
