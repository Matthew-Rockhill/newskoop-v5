/**
 * Diary Assignee — Integration Tests (Real API)
 *
 * Tests diary entry assignment: creating with assignee, filtering by assignee,
 * assignee permissions (edit, toggle, delete), and response shape.
 */

import { StaffRole } from '@prisma/client';
import {
  createTestUser,
  createSessionCookie,
  apiFetch,
  cleanupTestData,
} from './test-helpers';

const SUFFIX = 'da'; // diary-assignee

// Shared references
let journalist: { id: string; email: string; firstName: string; lastName: string; userType: string; staffRole: string | null };
let intern: typeof journalist;
let subEditor: typeof journalist;
let journalistCookie: string;
let internCookie: string;
let subEditorCookie: string;

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await cleanupTestData(SUFFIX);

  const journalistUser = await createTestUser(StaffRole.JOURNALIST, SUFFIX, 'journalist');
  const internUser = await createTestUser(StaffRole.INTERN, SUFFIX, 'intern');
  const subEditorUser = await createTestUser(StaffRole.SUB_EDITOR, SUFFIX, 'subeditor');

  journalist = { ...journalistUser, staffRole: journalistUser.staffRole };
  intern = { ...internUser, staffRole: internUser.staffRole };
  subEditor = { ...subEditorUser, staffRole: subEditorUser.staffRole };

  journalistCookie = await createSessionCookie(journalist);
  internCookie = await createSessionCookie(intern);
  subEditorCookie = await createSessionCookie(subEditor);
}, 30000);

afterAll(async () => {
  await cleanupTestData(SUFFIX);
}, 30000);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Diary Assignee (API Integration)', () => {
  let entryWithAssignee: string; // will hold entry ID

  it('creates diary entry with assignee', async () => {
    const res = await apiFetch('/api/newsroom/diary', journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__da_assigned_entry',
        dateTime: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        notes: 'Test entry with assignee',
        assignedToId: intern.id,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.entry.assignedToId).toBe(intern.id);
    expect(body.entry.assignedTo).toBeTruthy();
    expect(body.entry.assignedTo.id).toBe(intern.id);
    expect(body.entry.assignedTo.firstName).toBe('__test__');
    expect(body.entry.createdById).toBe(journalist.id);
    entryWithAssignee = body.entry.id;
  });

  it('creates diary entry without assignee', async () => {
    const res = await apiFetch('/api/newsroom/diary', journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__da_no_assignee',
        dateTime: new Date(Date.now() + 86400000 * 2).toISOString(),
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.entry.assignedToId).toBeNull();
    expect(body.entry.assignedTo).toBeNull();
  });

  it('GET single entry includes assignedTo', async () => {
    const res = await apiFetch(`/api/newsroom/diary/${entryWithAssignee}`, journalistCookie);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entry.assignedTo).toBeTruthy();
    expect(body.entry.assignedTo.id).toBe(intern.id);
  });

  it('filters diary entries by assigneeId', async () => {
    const res = await apiFetch(
      `/api/newsroom/diary?assigneeId=${intern.id}&includeCompleted=true`,
      journalistCookie
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries.length).toBeGreaterThanOrEqual(1);
    // Every returned entry should be assigned to the intern
    for (const entry of body.entries) {
      expect(entry.assignedToId).toBe(intern.id);
    }
  });

  it('assignee can update the entry', async () => {
    const res = await apiFetch(`/api/newsroom/diary/${entryWithAssignee}`, internCookie, {
      method: 'PUT',
      body: JSON.stringify({
        title: '__test__da_updated_by_assignee',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entry.title).toBe('__test__da_updated_by_assignee');
  });

  it('assignee can toggle completion', async () => {
    const res = await apiFetch(`/api/newsroom/diary/${entryWithAssignee}`, internCookie, {
      method: 'PATCH',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entry.isCompleted).toBe(true);
    expect(body.entry.assignedTo).toBeTruthy();

    // Toggle back
    const res2 = await apiFetch(`/api/newsroom/diary/${entryWithAssignee}`, internCookie, {
      method: 'PATCH',
    });
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.entry.isCompleted).toBe(false);
  });

  it('non-creator/non-assignee intern cannot edit another entry', async () => {
    // Create an entry by journalist, assigned to sub-editor (not intern)
    const createRes = await apiFetch('/api/newsroom/diary', journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__da_no_access',
        dateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        assignedToId: subEditor.id,
      }),
    });
    const created = await createRes.json();

    // Intern tries to edit — should be denied
    const res = await apiFetch(`/api/newsroom/diary/${created.entry.id}`, internCookie, {
      method: 'PUT',
      body: JSON.stringify({ title: '__test__da_hacked' }),
    });

    expect(res.status).toBe(403);
  });

  it('can update assignee on existing entry', async () => {
    const res = await apiFetch(`/api/newsroom/diary/${entryWithAssignee}`, journalistCookie, {
      method: 'PUT',
      body: JSON.stringify({
        assignedToId: subEditor.id,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entry.assignedToId).toBe(subEditor.id);
    expect(body.entry.assignedTo.id).toBe(subEditor.id);
  });

  it('can remove assignee by setting null', async () => {
    const res = await apiFetch(`/api/newsroom/diary/${entryWithAssignee}`, journalistCookie, {
      method: 'PUT',
      body: JSON.stringify({
        assignedToId: null,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entry.assignedToId).toBeNull();
    expect(body.entry.assignedTo).toBeNull();
  });

  it('rejects invalid assignee ID', async () => {
    const res = await apiFetch('/api/newsroom/diary', journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__da_bad_assignee',
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        assignedToId: 'nonexistent-user-id',
      }),
    });

    expect(res.status).toBe(400);
  });

  it('assignee can delete the entry', async () => {
    // Create entry assigned to intern
    const createRes = await apiFetch('/api/newsroom/diary', journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__da_delete_by_assignee',
        dateTime: new Date(Date.now() + 86400000 * 4).toISOString(),
        assignedToId: intern.id,
      }),
    });
    const created = await createRes.json();

    // Intern (assignee) deletes it
    const res = await apiFetch(`/api/newsroom/diary/${created.entry.id}`, internCookie, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('upcoming endpoint includes assignedTo', async () => {
    // Create a diary entry due soon with assignee
    await apiFetch('/api/newsroom/diary', journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__da_upcoming_assignee',
        dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        assignedToId: intern.id,
      }),
    });

    const res = await apiFetch('/api/newsroom/diary/upcoming', journalistCookie);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Find our test entry
    const testEntry = body.entries.find(
      (e: { title: string }) => e.title === '__test__da_upcoming_assignee'
    );
    expect(testEntry).toBeTruthy();
    expect(testEntry.assignedTo).toBeTruthy();
    expect(testEntry.assignedTo.id).toBe(intern.id);
  });
});
