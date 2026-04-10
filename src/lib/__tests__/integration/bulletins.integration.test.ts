/**
 * Bulletins — Integration Tests (Real API)
 *
 * Hits the actual /api/newsroom/bulletins endpoints with real session cookies
 * to verify CRUD operations, status transitions, story management, permission
 * checks, and pagination work end-to-end through the full stack.
 *
 * Note: These routes use getServerSession(authOptions) directly, NOT the
 * createHandler/withAuth middleware pattern.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  createTestCategory,
  createTestClassification,
  createTestStory,
  createTestBulletin,
  createTestBulletinSchedule,
  createSessionCookie,
  apiFetch,
  cleanupTestData,
} from './test-helpers';
import { ClassificationType, StoryStage, StoryStatus } from '@prisma/client';

const SUFFIX = 'bl';
const TIMEOUT = 30_000;

// Shared references
let editor: { id: string; email: string; firstName: string; lastName: string; userType: string; staffRole: string | null };
let subEditor: typeof editor;
let journalist: typeof editor;
let intern: typeof editor;
let editorCookie: string;
let subEditorCookie: string;
let journalistCookie: string;
let internCookie: string;

let categoryId: string;
let langClassId: string;
let publishedStoryA: { id: string };
let publishedStoryB: { id: string };
let publishedStoryC: { id: string };
let scheduleId: string;

// Bulletin IDs created during tests
let createdBulletinId: string;
let bulletinForStatusFlow: { id: string };
let bulletinForDelete: { id: string };
let bulletinInReview: { id: string };

describe('Bulletins (API Integration)', () => {
  // -------------------------------------------------------------------------
  // Setup & Teardown
  // -------------------------------------------------------------------------

  beforeAll(async () => {
    await cleanupTestData(SUFFIX);

    // Users
    const editorUser = await createTestUser('EDITOR', SUFFIX);
    const subEditorUser = await createTestUser('SUB_EDITOR', SUFFIX);
    const journalistUser = await createTestUser('JOURNALIST', SUFFIX);
    const internUser = await createTestUser('INTERN', SUFFIX);

    editor = { ...editorUser, staffRole: editorUser.staffRole };
    subEditor = { ...subEditorUser, staffRole: subEditorUser.staffRole };
    journalist = { ...journalistUser, staffRole: journalistUser.staffRole };
    intern = { ...internUser, staffRole: internUser.staffRole };

    editorCookie = await createSessionCookie(editor);
    subEditorCookie = await createSessionCookie(subEditor);
    journalistCookie = await createSessionCookie(journalist);
    internCookie = await createSessionCookie(intern);

    // Category
    const cat = await createTestCategory('bulletins', SUFFIX);
    categoryId = cat.id;

    // Classification
    const langClass = await createTestClassification(
      'English',
      ClassificationType.LANGUAGE,
      SUFFIX
    );
    langClassId = langClass.id;

    // Published stories (needed for bulletin story attachment)
    publishedStoryA = await createTestStory({
      suffix: SUFFIX,
      label: 'pub_story_a',
      authorId: editor.id,
      authorRole: 'EDITOR',
      stage: StoryStage.PUBLISHED,
      status: StoryStatus.APPROVED,
      categoryId,
      classificationIds: [langClassId],
      publishedAt: new Date(),
    });

    publishedStoryB = await createTestStory({
      suffix: SUFFIX,
      label: 'pub_story_b',
      authorId: editor.id,
      authorRole: 'EDITOR',
      stage: StoryStage.PUBLISHED,
      status: StoryStatus.APPROVED,
      categoryId,
      classificationIds: [langClassId],
      publishedAt: new Date(),
    });

    publishedStoryC = await createTestStory({
      suffix: SUFFIX,
      label: 'pub_story_c',
      authorId: editor.id,
      authorRole: 'EDITOR',
      stage: StoryStage.PUBLISHED,
      status: StoryStatus.APPROVED,
      categoryId,
      classificationIds: [langClassId],
      publishedAt: new Date(),
    });

    // Bulletin schedule
    const schedule = await createTestBulletinSchedule({
      suffix: SUFFIX,
      label: 'morning',
      createdById: editor.id,
      time: '07:00',
      language: 'ENGLISH',
      scheduleType: 'WEEKDAY',
    });
    scheduleId = schedule.id;

    // Ensure 'news-bulletins' category exists (the API auto-creates it, but
    // we need a known categoryId for direct DB bulletin creation)
    const { prisma } = await import('@/lib/prisma');
    let newsBulletinsCat = await prisma.category.findFirst({
      where: { slug: 'news-bulletins' },
    });
    if (!newsBulletinsCat) {
      newsBulletinsCat = await prisma.category.create({
        data: {
          name: 'News Bulletins',
          slug: 'news-bulletins',
          description: 'News bulletins for radio stations',
          level: 1,
          isParent: true,
          isEditable: false,
        },
      });
    }

    // Pre-created bulletins for status-flow and delete tests
    bulletinForStatusFlow = await createTestBulletin({
      suffix: SUFFIX,
      label: 'status_flow',
      authorId: subEditor.id,
      categoryId: newsBulletinsCat.id,
      language: 'ENGLISH',
      status: 'DRAFT',
    });

    bulletinForDelete = await createTestBulletin({
      suffix: SUFFIX,
      label: 'for_delete',
      authorId: subEditor.id,
      categoryId: newsBulletinsCat.id,
      language: 'ENGLISH',
      status: 'DRAFT',
    });

    bulletinInReview = await createTestBulletin({
      suffix: SUFFIX,
      label: 'in_review',
      authorId: subEditor.id,
      categoryId: newsBulletinsCat.id,
      language: 'ENGLISH',
      status: 'IN_REVIEW',
      reviewerId: editor.id,
    });
  }, TIMEOUT);

  afterAll(async () => {
    await cleanupTestData(SUFFIX);
  }, TIMEOUT);

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  it('returns 401 when no session cookie is provided (GET list)', async () => {
    const res = await fetch('http://localhost:3099/api/newsroom/bulletins', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 when no session cookie is provided (POST create)', async () => {
    const res = await fetch('http://localhost:3099/api/newsroom/bulletins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized',
        intro: 'intro',
        outro: 'outro',
        language: 'ENGLISH',
      }),
    });
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Role-based access — listing
  // -------------------------------------------------------------------------

  it('EDITOR can list bulletins', async () => {
    const res = await apiFetch('/api/newsroom/bulletins', editorCookie);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletins).toBeDefined();
    expect(data.pagination).toBeDefined();
  });

  it('SUB_EDITOR can list bulletins', async () => {
    const res = await apiFetch('/api/newsroom/bulletins', subEditorCookie);
    expect(res.status).toBe(200);
  });

  it('JOURNALIST cannot list bulletins (403)', async () => {
    const res = await apiFetch('/api/newsroom/bulletins', journalistCookie);
    expect(res.status).toBe(403);
  });

  it('INTERN cannot list bulletins (403)', async () => {
    const res = await apiFetch('/api/newsroom/bulletins', internCookie);
    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  it('supports pagination parameters', async () => {
    const res = await apiFetch(
      '/api/newsroom/bulletins?page=1&perPage=2',
      editorCookie
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.perPage).toBe(2);
    expect(data.bulletins.length).toBeLessThanOrEqual(2);
  });

  // -------------------------------------------------------------------------
  // Create bulletin
  // -------------------------------------------------------------------------

  it('SUB_EDITOR can create a bulletin', async () => {
    const res = await apiFetch('/api/newsroom/bulletins', subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: `__test__${SUFFIX}_created_by_sub`,
        intro: 'Good morning, here is the news.',
        outro: 'That was the news.',
        language: 'ENGLISH',
        scheduleId,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.bulletin).toBeDefined();
    expect(data.bulletin.title).toBe(`__test__${SUFFIX}_created_by_sub`);
    expect(data.bulletin.status).toBe('DRAFT');
    expect(data.bulletin.author.id).toBe(subEditor.id);
    expect(data.bulletin.schedule).toBeDefined();
    createdBulletinId = data.bulletin.id;
  });

  it('auto-generates a slug from the title', async () => {
    const res = await apiFetch('/api/newsroom/bulletins', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: `__test__${SUFFIX}_slug generation test`,
        intro: 'Intro text',
        outro: 'Outro text',
        language: 'AFRIKAANS',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.bulletin.slug).toBeDefined();
    expect(data.bulletin.slug.length).toBeGreaterThan(0);
    // Slug should be lowercase with hyphens
    expect(data.bulletin.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await apiFetch('/api/newsroom/bulletins', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Missing intro/outro',
        language: 'ENGLISH',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('can create a bulletin with stories attached', async () => {
    const res = await apiFetch('/api/newsroom/bulletins', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: `__test__${SUFFIX}_with_stories`,
        intro: 'Intro',
        outro: 'Outro',
        language: 'ENGLISH',
        stories: [
          { storyId: publishedStoryA.id, order: 1 },
          { storyId: publishedStoryB.id, order: 2 },
        ],
      }),
    });
    expect(res.status).toBe(201);
  });

  // -------------------------------------------------------------------------
  // Get single bulletin
  // -------------------------------------------------------------------------

  it('returns a single bulletin with stories', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${createdBulletinId}`,
      editorCookie
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletin).toBeDefined();
    expect(data.bulletin.id).toBe(createdBulletinId);
    expect(data.bulletin.author).toBeDefined();
    expect(data.bulletin.bulletinStories).toBeDefined();
  });

  it('JOURNALIST can view a single bulletin', async () => {
    // GET /[id] allows JOURNALIST (different from list which requires SUB_EDITOR+)
    const res = await apiFetch(
      `/api/newsroom/bulletins/${createdBulletinId}`,
      journalistCookie
    );
    expect(res.status).toBe(200);
  });

  it('returns 404 for non-existent bulletin', async () => {
    const res = await apiFetch(
      '/api/newsroom/bulletins/non-existent-id',
      editorCookie
    );
    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Update bulletin
  // -------------------------------------------------------------------------

  it('author can update their own draft bulletin title', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${createdBulletinId}`,
      subEditorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({
          title: `__test__${SUFFIX}_updated_title`,
        }),
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletin.title).toBe(`__test__${SUFFIX}_updated_title`);
  });

  it('EDITOR can update any draft bulletin', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${createdBulletinId}`,
      editorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({
          intro: 'Updated intro by editor',
        }),
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletin).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Status transitions
  // -------------------------------------------------------------------------

  it('transitions DRAFT -> IN_REVIEW', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${bulletinForStatusFlow.id}`,
      subEditorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_REVIEW' }),
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletin.status).toBe('IN_REVIEW');
  });

  it('transitions IN_REVIEW -> APPROVED (SUB_EDITOR+)', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${bulletinForStatusFlow.id}`,
      editorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletin.status).toBe('APPROVED');
  });

  it('transitions APPROVED -> PUBLISHED and sets publishedAt', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${bulletinForStatusFlow.id}`,
      editorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PUBLISHED' }),
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletin.status).toBe('PUBLISHED');
    expect(data.bulletin.publishedAt).toBeTruthy();
  });

  it('JOURNALIST cannot update a bulletin in review (403)', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${bulletinInReview.id}`,
      journalistCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Journalist edit' }),
      }
    );
    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Delete bulletin
  // -------------------------------------------------------------------------

  it('author can delete their own DRAFT bulletin', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${bulletinForDelete.id}`,
      subEditorCookie,
      { method: 'DELETE' }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain('deleted');
  });

  it('cannot delete a non-DRAFT bulletin (403)', async () => {
    // bulletinForStatusFlow is now PUBLISHED
    const res = await apiFetch(
      `/api/newsroom/bulletins/${bulletinForStatusFlow.id}`,
      editorCookie,
      { method: 'DELETE' }
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('draft');
  });

  it('returns 404 when deleting a non-existent bulletin', async () => {
    const res = await apiFetch(
      '/api/newsroom/bulletins/non-existent-id',
      editorCookie,
      { method: 'DELETE' }
    );
    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Bulletin stories (PATCH /[id]/stories — replace all)
  // -------------------------------------------------------------------------

  it('author can replace stories on their draft bulletin', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${createdBulletinId}/stories`,
      subEditorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({
          stories: [
            { storyId: publishedStoryA.id, order: 1 },
            { storyId: publishedStoryB.id, order: 2 },
            { storyId: publishedStoryC.id, order: 3 },
          ],
        }),
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletin.bulletinStories).toHaveLength(3);
  });

  it('stories are returned in order', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${createdBulletinId}`,
      editorCookie
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    const orders = data.bulletin.bulletinStories.map((bs: any) => bs.order);
    expect(orders).toEqual([1, 2, 3]);
  });

  it('can reorder stories', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${createdBulletinId}/stories`,
      subEditorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({
          stories: [
            { storyId: publishedStoryC.id, order: 1 },
            { storyId: publishedStoryA.id, order: 2 },
          ],
        }),
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletin.bulletinStories).toHaveLength(2);
    expect(data.bulletin.bulletinStories[0].storyId).toBe(publishedStoryC.id);
    expect(data.bulletin.bulletinStories[1].storyId).toBe(publishedStoryA.id);
  });

  // -------------------------------------------------------------------------
  // Bulletin stories (POST /[id]/stories — add single)
  // -------------------------------------------------------------------------

  it('author can add a single story to their draft bulletin', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${createdBulletinId}/stories`,
      subEditorCookie,
      {
        method: 'POST',
        body: JSON.stringify({ storyId: publishedStoryB.id }),
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bulletinStory).toBeDefined();
    expect(data.bulletinStory.storyId).toBe(publishedStoryB.id);
  });

  it('returns 400 when adding a duplicate story', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/${createdBulletinId}/stories`,
      subEditorCookie,
      {
        method: 'POST',
        body: JSON.stringify({ storyId: publishedStoryB.id }),
      }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('already in bulletin');
  });

  // -------------------------------------------------------------------------
  // Filter by status/language
  // -------------------------------------------------------------------------

  it('can filter bulletins by language', async () => {
    const res = await apiFetch(
      '/api/newsroom/bulletins?language=AFRIKAANS',
      editorCookie
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    for (const b of data.bulletins) {
      expect(b.language).toBe('AFRIKAANS');
    }
  });
});
