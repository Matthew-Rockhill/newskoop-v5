/**
 * Translation Cascade — Integration Tests (Real API)
 *
 * Hits the actual POST /api/newsroom/stories/[id]/stage endpoint to verify:
 * 1. Approving one translation doesn't auto-advance the parent
 * 2. Approving ALL translations auto-advances the parent to TRANSLATED
 * 3. Publishing the parent cascades PUBLISHED to all translations
 *
 * Uses real HTTP calls through the full stack.
 */

import { prisma } from '@/lib/prisma';
import {
  StoryStage,
  StoryStatus,
  StoryLanguage,
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

const SUFFIX = 'tc'; // translation-cascade

// Shared references
let subEditorCookie: string;
let authorId: string;
let categoryId: string;
let langClassId: string;
let relClassId: string;

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await cleanupTestData(SUFFIX);

  const author = await createTestUser('JOURNALIST', SUFFIX, 'author');
  authorId = author.id;

  const subEditor = await createTestUser('SUB_EDITOR', SUFFIX);
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

describe('Translation Cascade (API Integration)', () => {
  let parentStoryId: string;
  let translationAId: string;
  let translationBId: string;

  beforeAll(async () => {
    // Create parent story at APPROVED stage with all required fields
    const parent = await createTestStory({
      suffix: SUFFIX,
      label: 'parent',
      authorId,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.APPROVED,
      status: StoryStatus.APPROVED,
      categoryId,
      classificationIds: [langClassId, relClassId],
    });
    parentStoryId = parent.id;

    // Create two translation stories at NEEDS_SUB_EDITOR_APPROVAL
    // (so we can use approve_story action which triggers the cascade logic)
    const transA = await createTestStory({
      suffix: SUFFIX,
      label: 'trans_afr',
      authorId,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      language: StoryLanguage.AFRIKAANS,
      isTranslation: true,
      originalStoryId: parentStoryId,
      categoryId,
      classificationIds: [langClassId, relClassId],
    });
    translationAId = transA.id;

    const transB = await createTestStory({
      suffix: SUFFIX,
      label: 'trans_xhosa',
      authorId,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      language: StoryLanguage.XHOSA,
      isTranslation: true,
      originalStoryId: parentStoryId,
      categoryId,
      classificationIds: [langClassId, relClassId],
    });
    translationBId = transB.id;
  });

  it('approving one translation does NOT auto-advance parent', async () => {
    // Approve translation A via the API
    const res = await apiFetch(
      `/api/newsroom/stories/${translationAId}/stage`,
      subEditorCookie,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'approve_story' }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    // Translation approval sets stage to TRANSLATED (not APPROVED) for translations
    expect(body.story.stage).toBe('TRANSLATED');

    // Parent should still be at APPROVED (translation B is still pending)
    const parent = await prisma.story.findUnique({
      where: { id: parentStoryId },
      select: { stage: true },
    });
    expect(parent?.stage).toBe('APPROVED');
  });

  it('approving ALL translations auto-advances parent to TRANSLATED', async () => {
    // Approve translation B via the API
    const res = await apiFetch(
      `/api/newsroom/stories/${translationBId}/stage`,
      subEditorCookie,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'approve_story' }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.story.stage).toBe('TRANSLATED');

    // Now ALL translations are approved — parent should auto-advance to TRANSLATED
    const parent = await prisma.story.findUnique({
      where: { id: parentStoryId },
      select: { stage: true },
    });
    expect(parent?.stage).toBe('TRANSLATED');
  });

  it('publishing parent cascades to all translations', async () => {
    // Parent is now at TRANSLATED stage — publish it
    const res = await apiFetch(
      `/api/newsroom/stories/${parentStoryId}/stage`,
      subEditorCookie,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'publish_story' }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.story.stage).toBe('PUBLISHED');
    expect(body.story.status).toBe('PUBLISHED');

    // Verify all translations were cascade-published
    const translations = await prisma.story.findMany({
      where: {
        originalStoryId: parentStoryId,
        isTranslation: true,
      },
      select: { id: true, stage: true, status: true, publishedAt: true },
    });

    expect(translations.length).toBe(2);
    for (const t of translations) {
      expect(t.stage).toBe('PUBLISHED');
      expect(t.status).toBe('PUBLISHED');
      expect(t.publishedAt).not.toBeNull();
    }
  });
});
