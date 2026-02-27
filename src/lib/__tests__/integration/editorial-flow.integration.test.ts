/**
 * Editorial Flow — Integration Tests (Real API)
 *
 * Hits the actual POST /api/newsroom/stories/[id]/stage endpoint with real
 * session cookies to verify stage transitions, permission checks, and
 * approval-gate validations work end-to-end through the full stack.
 */

import {
  StoryStage,
  ClassificationType,
  StaffRole,
} from '@prisma/client';
import {
  createTestUser,
  createTestCategory,
  createTestClassification,
  createTestStory,
  createSessionCookie,
  apiFetch,
  cleanupTestData,
} from './test-helpers';

const SUFFIX = 'ef'; // editorial-flow

// Shared references
let intern: { id: string; email: string; firstName: string; lastName: string; userType: string; staffRole: string | null };
let journalist: typeof intern;
let subEditor: typeof intern;
let internCookie: string;
let journalistCookie: string;
let subEditorCookie: string;
let categoryId: string;
let langClassId: string;
let relClassId: string;

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await cleanupTestData(SUFFIX);

  const internUser = await createTestUser('INTERN', SUFFIX);
  const journalistUser = await createTestUser('JOURNALIST', SUFFIX);
  const subEditorUser = await createTestUser('SUB_EDITOR', SUFFIX);

  intern = { ...internUser, staffRole: internUser.staffRole };
  journalist = { ...journalistUser, staffRole: journalistUser.staffRole };
  subEditor = { ...subEditorUser, staffRole: subEditorUser.staffRole };

  internCookie = await createSessionCookie(intern);
  journalistCookie = await createSessionCookie(journalist);
  subEditorCookie = await createSessionCookie(subEditor);

  const cat = await createTestCategory('general', SUFFIX);
  categoryId = cat.id;

  const langClass = await createTestClassification(
    'English',
    ClassificationType.LANGUAGE,
    SUFFIX
  );
  const relClass = await createTestClassification(
    'Christian',
    ClassificationType.RELIGION,
    SUFFIX
  );
  langClassId = langClass.id;
  relClassId = relClass.id;
}, 30000);

afterAll(async () => {
  await cleanupTestData(SUFFIX);
}, 30000);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Editorial Flow (API Integration)', () => {
  it('intern submits story for journalist review', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'intern_submit',
      authorId: intern.id,
      authorRole: StaffRole.INTERN,
      stage: StoryStage.DRAFT,
    });

    const res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, internCookie, {
      method: 'POST',
      body: JSON.stringify({
        action: 'submit_for_review',
        assignedUserId: journalist.id,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.story.stage).toBe('NEEDS_JOURNALIST_REVIEW');
  });

  it('journalist sends intern story for approval', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'journalist_approve',
      authorId: intern.id,
      authorRole: StaffRole.INTERN,
      stage: StoryStage.NEEDS_JOURNALIST_REVIEW,
    });

    const res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        action: 'send_for_approval',
        assignedUserId: subEditor.id,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.story.stage).toBe('NEEDS_SUB_EDITOR_APPROVAL');
  });

  it('approval rejected without category', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'no_category',
      authorId: journalist.id,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      classificationIds: [langClassId, relClassId],
      // categoryId intentionally omitted
    });

    const res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve_story' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/category/i);
  });

  it('approval rejected without language classification', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'no_lang',
      authorId: journalist.id,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      categoryId: categoryId,
      classificationIds: [relClassId], // only religion
    });

    const res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve_story' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/language/i);
  });

  it('approval rejected without religion classification', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'no_rel',
      authorId: journalist.id,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      categoryId: categoryId,
      classificationIds: [langClassId], // only language
    });

    const res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve_story' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/religion/i);
  });

  it('approval succeeds with all requirements met', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'full_approve',
      authorId: journalist.id,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      categoryId: categoryId,
      classificationIds: [langClassId, relClassId],
    });

    const res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve_story' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.story.stage).toBe('APPROVED');
  });

  it('intern cannot approve story (403)', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'intern_cant_approve',
      authorId: journalist.id,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      categoryId: categoryId,
      classificationIds: [langClassId, relClassId],
    });

    const res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, internCookie, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve_story' }),
    });

    expect(res.status).toBe(403);
  });

  it('full pipeline: DRAFT → PUBLISHED', async () => {
    // Create a story authored by an intern with all required fields
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'full_pipeline',
      authorId: intern.id,
      authorRole: StaffRole.INTERN,
      stage: StoryStage.DRAFT,
      categoryId: categoryId,
      classificationIds: [langClassId, relClassId],
    });

    // 1. DRAFT → NEEDS_JOURNALIST_REVIEW (intern submits)
    let res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, internCookie, {
      method: 'POST',
      body: JSON.stringify({
        action: 'submit_for_review',
        assignedUserId: journalist.id,
      }),
    });
    expect(res.status).toBe(200);
    let body = await res.json();
    expect(body.story.stage).toBe('NEEDS_JOURNALIST_REVIEW');

    // 2. NEEDS_JOURNALIST_REVIEW → NEEDS_SUB_EDITOR_APPROVAL (journalist approves)
    res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        action: 'send_for_approval',
        assignedUserId: subEditor.id,
      }),
    });
    expect(res.status).toBe(200);
    body = await res.json();
    expect(body.story.stage).toBe('NEEDS_SUB_EDITOR_APPROVAL');

    // 3. NEEDS_SUB_EDITOR_APPROVAL → APPROVED (sub-editor approves)
    res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve_story' }),
    });
    expect(res.status).toBe(200);
    body = await res.json();
    expect(body.story.stage).toBe('APPROVED');

    // 4. APPROVED → PUBLISHED (skip translation — story has no translations,
    //    so mark_as_translated publishes directly)
    res = await apiFetch(`/api/newsroom/stories/${story.id}/stage`, subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({ action: 'mark_as_translated' }),
    });
    expect(res.status).toBe(200);
    body = await res.json();
    expect(body.story.stage).toBe('PUBLISHED');
    expect(body.story.status).toBe('PUBLISHED');
  });

  it('returns 401 without authentication', async () => {
    const res = await fetch('http://localhost:3099/api/newsroom/stories/fake-id/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_story' }),
    });
    expect(res.status).toBe(401);
  });
});
