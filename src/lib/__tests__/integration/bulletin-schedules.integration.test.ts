/**
 * Bulletin Schedules — Integration Tests (Real API)
 *
 * Hits the actual /api/newsroom/bulletins/schedules endpoints with real
 * session cookies to verify CRUD operations, permission checks, and
 * constraint enforcement (e.g. cannot delete schedule with bulletins).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  createTestBulletinSchedule,
  createSessionCookie,
  apiFetch,
  cleanupTestData,
} from './test-helpers';

const SUFFIX = 'bs';
const TIMEOUT = 30_000;

// Shared references
let editor: { id: string; email: string; firstName: string; lastName: string; userType: string; staffRole: string | null };
let subEditor: typeof editor;
let journalist: typeof editor;
let editorCookie: string;
let subEditorCookie: string;
let journalistCookie: string;

// Schedule created during setup (with bulletins linked — used for delete-with-bulletins test)
let scheduleWithBulletins: { id: string };
// Schedule created during setup (no bulletins — used for delete test)
let scheduleForDelete: { id: string };
// Schedule created via API test
let createdScheduleId: string;

describe('Bulletin Schedules (API Integration)', () => {
  // -------------------------------------------------------------------------
  // Setup & Teardown
  // -------------------------------------------------------------------------

  beforeAll(async () => {
    await cleanupTestData(SUFFIX);

    const editorUser = await createTestUser('EDITOR', SUFFIX);
    const subEditorUser = await createTestUser('SUB_EDITOR', SUFFIX);
    const journalistUser = await createTestUser('JOURNALIST', SUFFIX);

    editor = { ...editorUser, staffRole: editorUser.staffRole };
    subEditor = { ...subEditorUser, staffRole: subEditorUser.staffRole };
    journalist = { ...journalistUser, staffRole: journalistUser.staffRole };

    editorCookie = await createSessionCookie(editor);
    subEditorCookie = await createSessionCookie(subEditor);
    journalistCookie = await createSessionCookie(journalist);

    // Create a schedule that will have a bulletin linked (for delete-prevention test)
    scheduleWithBulletins = await createTestBulletinSchedule({
      suffix: SUFFIX,
      label: 'has_bulletins',
      createdById: editor.id,
      time: '08:00',
      language: 'ENGLISH',
      scheduleType: 'WEEKDAY',
    });

    // We need a category + bulletin to link to this schedule
    const { prisma } = await import('@/lib/prisma');
    let category = await prisma.category.findFirst({ where: { slug: 'news-bulletins' } });
    if (!category) {
      category = await prisma.category.create({
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
    await prisma.bulletin.create({
      data: {
        title: `__test__${SUFFIX}_linked_bulletin`,
        slug: `__test__${SUFFIX}_linked_bulletin_${Date.now()}`,
        intro: 'test intro',
        outro: 'test outro',
        language: 'ENGLISH',
        status: 'DRAFT',
        authorId: editor.id,
        categoryId: category.id,
        scheduleId: scheduleWithBulletins.id,
      },
    });

    // Create a schedule with no bulletins (for successful delete test)
    scheduleForDelete = await createTestBulletinSchedule({
      suffix: SUFFIX,
      label: 'for_delete',
      createdById: editor.id,
      time: '10:00',
      language: 'AFRIKAANS',
      scheduleType: 'WEEKEND',
    });
  }, TIMEOUT);

  afterAll(async () => {
    await cleanupTestData(SUFFIX);
  }, TIMEOUT);

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  it('returns 401 when no session cookie is provided (GET)', async () => {
    const res = await fetch(`http://localhost:3099/api/newsroom/bulletins/schedules`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 when no session cookie is provided (POST)', async () => {
    const res = await fetch(`http://localhost:3099/api/newsroom/bulletins/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized schedule',
        time: '09:00',
        language: 'ENGLISH',
        scheduleType: 'WEEKDAY',
      }),
    });
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Role-based access — listing
  // -------------------------------------------------------------------------

  it('SUB_EDITOR can list schedules', async () => {
    const res = await apiFetch('/api/newsroom/bulletins/schedules', subEditorCookie);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.schedules).toBeDefined();
    expect(Array.isArray(data.schedules)).toBe(true);
  });

  it('EDITOR can list schedules', async () => {
    const res = await apiFetch('/api/newsroom/bulletins/schedules', editorCookie);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.schedules).toBeDefined();
    // Should contain our test schedules
    const testSchedules = data.schedules.filter((s: any) =>
      s.title.startsWith(`__test__${SUFFIX}_`)
    );
    expect(testSchedules.length).toBeGreaterThanOrEqual(2);
  });

  it('JOURNALIST cannot list schedules (403)', async () => {
    const res = await apiFetch('/api/newsroom/bulletins/schedules', journalistCookie);
    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  it('EDITOR can create a schedule', async () => {
    const res = await apiFetch('/api/newsroom/bulletins/schedules', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: `__test__${SUFFIX}_created_via_api`,
        time: '14:00',
        language: 'XHOSA',
        scheduleType: 'WEEKDAY',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.schedule).toBeDefined();
    expect(data.schedule.title).toBe(`__test__${SUFFIX}_created_via_api`);
    expect(data.schedule.time).toBe('14:00');
    expect(data.schedule.language).toBe('XHOSA');
    expect(data.schedule.scheduleType).toBe('WEEKDAY');
    expect(data.schedule.creator).toBeDefined();
    createdScheduleId = data.schedule.id;
  });

  it('SUB_EDITOR cannot create a schedule (403)', async () => {
    const res = await apiFetch('/api/newsroom/bulletins/schedules', subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: `__test__${SUFFIX}_sub_attempt`,
        time: '15:00',
        language: 'ENGLISH',
        scheduleType: 'WEEKEND',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid time format', async () => {
    const res = await apiFetch('/api/newsroom/bulletins/schedules', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: `__test__${SUFFIX}_bad_time`,
        time: '25:99',
        language: 'ENGLISH',
        scheduleType: 'WEEKDAY',
      }),
    });
    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  it('EDITOR can update a schedule', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/schedules/${createdScheduleId}`,
      editorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({
          title: `__test__${SUFFIX}_updated_via_api`,
          time: '16:00',
        }),
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.schedule.title).toBe(`__test__${SUFFIX}_updated_via_api`);
    expect(data.schedule.time).toBe('16:00');
  });

  it('SUB_EDITOR cannot update a schedule (403)', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/schedules/${createdScheduleId}`,
      subEditorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({ title: `__test__${SUFFIX}_sub_update` }),
      }
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent schedule update', async () => {
    const res = await apiFetch(
      '/api/newsroom/bulletins/schedules/non-existent-id',
      editorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({ title: 'nope' }),
      }
    );
    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  it('cannot delete a schedule that has associated bulletins (400)', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/schedules/${scheduleWithBulletins.id}`,
      editorCookie,
      { method: 'DELETE' }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('associated bulletins');
  });

  it('EDITOR can delete a schedule with no bulletins', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/schedules/${scheduleForDelete.id}`,
      editorCookie,
      { method: 'DELETE' }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain('deleted');
  });

  it('SUB_EDITOR cannot delete a schedule (403)', async () => {
    const res = await apiFetch(
      `/api/newsroom/bulletins/schedules/${scheduleWithBulletins.id}`,
      subEditorCookie,
      { method: 'DELETE' }
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent schedule delete', async () => {
    const res = await apiFetch(
      '/api/newsroom/bulletins/schedules/non-existent-id',
      editorCookie,
      { method: 'DELETE' }
    );
    expect(res.status).toBe(404);
  });
});
