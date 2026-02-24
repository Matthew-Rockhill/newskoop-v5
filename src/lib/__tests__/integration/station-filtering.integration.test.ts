/**
 * Station Content Filtering — Integration Tests (Real API)
 *
 * Hits the actual GET /api/radio/stories endpoint with real session cookies
 * to verify that station-based content filtering works end-to-end:
 * auth → middleware → route handler → Prisma → response.
 *
 * All stations and radio users are pre-created in beforeAll for speed.
 */

import { ClassificationType, StoryStage, StoryStatus } from '@prisma/client';
import {
  createTestUser,
  createTestCategory,
  createTestClassification,
  createTestStory,
  createTestStation,
  createTestRadioUser,
  createSessionCookie,
  apiFetch,
  cleanupTestData,
} from './test-helpers';

const SUFFIX = 'sf'; // station-filtering

// Shared references populated in beforeAll
let englishName: string;
let xhosaName: string;
let christianName: string;
let muslimName: string;
let sportsCatId: string;
let storyA: { id: string }; // English + Christian + news
let storyB: { id: string }; // Xhosa  + Christian + news
let storyC: { id: string }; // English + Muslim   + sports
let storyD: { id: string }; // Xhosa  + Muslim   + sports
let draftStory: { id: string }; // DRAFT (not published)

// Pre-built cookies for each test scenario
let cookieAllAccess: string;
let cookieEngOnly: string;
let cookieChrOnly: string;
let cookieEngChr: string;
let cookieNoSports: string;
let cookieAfrikaans: string;

// Helper: extract test story IDs from an API response
function filterTestStoryIds(stories: Array<{ id: string }>) {
  const testIds = [storyA.id, storyB.id, storyC.id, storyD.id, draftStory.id];
  return stories.filter((s) => testIds.includes(s.id)).map((s) => s.id);
}

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await cleanupTestData(SUFFIX);

  // Create shared fixtures
  const author = await createTestUser('JOURNALIST', SUFFIX, 'author');

  const english = await createTestClassification('English', ClassificationType.LANGUAGE, SUFFIX);
  const xhosa = await createTestClassification('Xhosa', ClassificationType.LANGUAGE, SUFFIX);
  const christian = await createTestClassification('Christian', ClassificationType.RELIGION, SUFFIX);
  const muslim = await createTestClassification('Muslim', ClassificationType.RELIGION, SUFFIX);

  englishName = english.name;
  xhosaName = xhosa.name;
  christianName = christian.name;
  muslimName = muslim.name;

  const newsCat = await createTestCategory('news', SUFFIX);
  const sportsCat = await createTestCategory('sports', SUFFIX);
  sportsCatId = sportsCat.id;

  // Create stories + stations + users in parallel where possible
  [storyA, storyB, storyC, storyD, draftStory] = await Promise.all([
    createTestStory({
      suffix: SUFFIX, label: 'storyA', authorId: author.id,
      stage: StoryStage.PUBLISHED, status: StoryStatus.PUBLISHED,
      categoryId: newsCat.id, classificationIds: [english.id, christian.id],
      publishedAt: new Date('2026-01-01'),
    }),
    createTestStory({
      suffix: SUFFIX, label: 'storyB', authorId: author.id,
      stage: StoryStage.PUBLISHED, status: StoryStatus.PUBLISHED,
      categoryId: newsCat.id, classificationIds: [xhosa.id, christian.id],
      publishedAt: new Date('2026-01-02'),
    }),
    createTestStory({
      suffix: SUFFIX, label: 'storyC', authorId: author.id,
      stage: StoryStage.PUBLISHED, status: StoryStatus.PUBLISHED,
      categoryId: sportsCat.id, classificationIds: [english.id, muslim.id],
      publishedAt: new Date('2026-01-03'),
    }),
    createTestStory({
      suffix: SUFFIX, label: 'storyD', authorId: author.id,
      stage: StoryStage.PUBLISHED, status: StoryStatus.PUBLISHED,
      categoryId: sportsCat.id, classificationIds: [xhosa.id, muslim.id],
      publishedAt: new Date('2026-01-04'),
    }),
    createTestStory({
      suffix: SUFFIX, label: 'draft', authorId: author.id,
      stage: StoryStage.DRAFT, status: StoryStatus.DRAFT,
      categoryId: newsCat.id, classificationIds: [english.id, christian.id],
    }),
  ]);

  // Pre-create all 6 station/user/cookie combos in parallel
  async function makeStationCookie(
    label: string,
    langs: string[],
    rels: string[],
    blocked: string[] = []
  ) {
    const station = await createTestStation({
      suffix: SUFFIX, label,
      allowedLanguages: langs, allowedReligions: rels, blockedCategories: blocked,
    });
    const user = await createTestRadioUser(SUFFIX, station.id, `radio_${label}`);
    return createSessionCookie({
      id: user.id, email: user.email,
      firstName: user.firstName, lastName: user.lastName,
      userType: user.userType, radioStationId: station.id,
    });
  }

  [cookieAllAccess, cookieEngOnly, cookieChrOnly, cookieEngChr, cookieNoSports, cookieAfrikaans] =
    await Promise.all([
      makeStationCookie('all_access', [englishName, xhosaName], [christianName, muslimName]),
      makeStationCookie('eng_only', [englishName], [christianName, muslimName]),
      makeStationCookie('chr_only', [englishName, xhosaName], [christianName]),
      makeStationCookie('eng_chr', [englishName], [christianName]),
      makeStationCookie('no_sports', [englishName, xhosaName], [christianName, muslimName], [sportsCatId]),
      makeStationCookie('afrikaans', [`__test__${SUFFIX}_Afrikaans`], [christianName, muslimName]),
    ]);
}, 30000);

afterAll(async () => {
  await cleanupTestData(SUFFIX);
}, 30000);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Station Content Filtering (API Integration)', () => {
  it('returns only PUBLISHED stories matching station filters', async () => {
    const res = await apiFetch('/api/radio/stories?perPage=100', cookieAllAccess);
    expect(res.status).toBe(200);

    const body = await res.json();
    const ids = filterTestStoryIds(body.stories);

    expect(ids).toContain(storyA.id);
    expect(ids).toContain(storyB.id);
    expect(ids).toContain(storyC.id);
    expect(ids).toContain(storyD.id);
    expect(ids).not.toContain(draftStory.id);
  });

  it('filters by language — English only', async () => {
    const res = await apiFetch('/api/radio/stories?perPage=100', cookieEngOnly);
    expect(res.status).toBe(200);

    const body = await res.json();
    const ids = filterTestStoryIds(body.stories);

    expect(ids).toContain(storyA.id);
    expect(ids).toContain(storyC.id);
    expect(ids).not.toContain(storyB.id);
    expect(ids).not.toContain(storyD.id);
  });

  it('filters by religion — Christian only', async () => {
    const res = await apiFetch('/api/radio/stories?perPage=100', cookieChrOnly);
    expect(res.status).toBe(200);

    const body = await res.json();
    const ids = filterTestStoryIds(body.stories);

    expect(ids).toContain(storyA.id);
    expect(ids).toContain(storyB.id);
    expect(ids).not.toContain(storyC.id);
    expect(ids).not.toContain(storyD.id);
  });

  it('requires BOTH language AND religion match', async () => {
    const res = await apiFetch('/api/radio/stories?perPage=100', cookieEngChr);
    expect(res.status).toBe(200);

    const body = await res.json();
    const ids = filterTestStoryIds(body.stories);

    expect(ids).toContain(storyA.id);
    expect(ids).not.toContain(storyB.id);
    expect(ids).not.toContain(storyC.id);
    expect(ids).not.toContain(storyD.id);
  });

  it('excludes blocked categories', async () => {
    const res = await apiFetch('/api/radio/stories?perPage=100', cookieNoSports);
    expect(res.status).toBe(200);

    const body = await res.json();
    const ids = filterTestStoryIds(body.stories);

    expect(ids).toContain(storyA.id);
    expect(ids).toContain(storyB.id);
    expect(ids).not.toContain(storyC.id);
    expect(ids).not.toContain(storyD.id);
  });

  it('returns empty for unmatched classifications', async () => {
    const res = await apiFetch('/api/radio/stories?perPage=100', cookieAfrikaans);
    expect(res.status).toBe(200);

    const body = await res.json();
    const ids = filterTestStoryIds(body.stories);
    expect(ids).toHaveLength(0);
  });

  it('returns 401 without authentication', async () => {
    const res = await fetch('http://localhost:3099/api/radio/stories');
    expect(res.status).toBe(401);
  });
});
