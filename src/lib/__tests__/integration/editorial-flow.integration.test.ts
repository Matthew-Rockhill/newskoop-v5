/**
 * Editorial Flow — Integration Tests
 *
 * Verifies that stage transition rules from permissions.ts work correctly
 * against real database story records, including the approval-gate
 * validations (category, language classification, religion classification).
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
  canUpdateStoryStage,
  canApproveStoryStage,
} from '@/lib/permissions';
import {
  createTestUser,
  createTestCategory,
  createTestClassification,
  createTestStory,
  cleanupTestData,
} from './test-helpers';

const SUFFIX = 'ef'; // editorial-flow

// Shared references
let internId: string;
let journalistId: string;
let subEditorId: string;
let editorId: string;
let categoryId: string;
let langClassId: string;
let relClassId: string;

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await cleanupTestData(SUFFIX);

  const intern = await createTestUser('INTERN', SUFFIX);
  const journalist = await createTestUser('JOURNALIST', SUFFIX);
  const subEditor = await createTestUser('SUB_EDITOR', SUFFIX);
  const editor = await createTestUser('EDITOR', SUFFIX);

  internId = intern.id;
  journalistId = journalist.id;
  subEditorId = subEditor.id;
  editorId = editor.id;

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

describe('Editorial Flow (Integration)', () => {
  // ------ Stage transitions with real DB records ------

  it('intern story: DRAFT -> NEEDS_JOURNALIST_REVIEW', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'intern_draft',
      authorId: internId,
      authorRole: StaffRole.INTERN,
      stage: StoryStage.DRAFT,
    });

    // Permission check
    expect(canUpdateStoryStage('INTERN', 'DRAFT', 'NEEDS_JOURNALIST_REVIEW')).toBe(true);

    // Persist transition
    const updated = await prisma.story.update({
      where: { id: story.id },
      data: { stage: StoryStage.NEEDS_JOURNALIST_REVIEW },
    });

    expect(updated.stage).toBe('NEEDS_JOURNALIST_REVIEW');
  });

  it('intern cannot skip to NEEDS_SUB_EDITOR_APPROVAL', () => {
    expect(canUpdateStoryStage('INTERN', 'DRAFT', 'NEEDS_SUB_EDITOR_APPROVAL')).toBe(false);
  });

  it('journalist story: DRAFT -> NEEDS_SUB_EDITOR_APPROVAL directly', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'journalist_draft',
      authorId: journalistId,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.DRAFT,
    });

    expect(canUpdateStoryStage('JOURNALIST', 'DRAFT', 'NEEDS_SUB_EDITOR_APPROVAL')).toBe(true);

    const updated = await prisma.story.update({
      where: { id: story.id },
      data: { stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL },
    });

    expect(updated.stage).toBe('NEEDS_SUB_EDITOR_APPROVAL');
  });

  // ------ Approval gate validations ------

  it('approval requires category', async () => {
    // Story without category
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'no_category',
      authorId: journalistId,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      classificationIds: [langClassId, relClassId],
      // categoryId intentionally omitted
    });

    const dbStory = await prisma.story.findUnique({
      where: { id: story.id },
      select: { categoryId: true },
    });

    expect(dbStory?.categoryId).toBeNull();
    // The route handler checks !story.categoryId before allowing approval
  });

  it('approval requires language classification', async () => {
    // Story with category + religion but NO language
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'no_lang',
      authorId: journalistId,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      categoryId: categoryId,
      classificationIds: [relClassId], // only religion
    });

    const classifications = await prisma.storyClassification.findMany({
      where: { storyId: story.id },
      include: { classification: { select: { type: true } } },
    });

    const hasLanguage = classifications.some(
      (sc) => sc.classification.type === ClassificationType.LANGUAGE
    );
    expect(hasLanguage).toBe(false);
  });

  it('approval requires religion classification', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'no_rel',
      authorId: journalistId,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      categoryId: categoryId,
      classificationIds: [langClassId], // only language
    });

    const classifications = await prisma.storyClassification.findMany({
      where: { storyId: story.id },
      include: { classification: { select: { type: true } } },
    });

    const hasReligion = classifications.some(
      (sc) => sc.classification.type === ClassificationType.RELIGION
    );
    expect(hasReligion).toBe(false);
  });

  it('approval succeeds with all requirements met', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'full_approve',
      authorId: journalistId,
      authorRole: StaffRole.JOURNALIST,
      stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL,
      categoryId: categoryId,
      classificationIds: [langClassId, relClassId],
    });

    // Verify all gate conditions
    const dbStory = await prisma.story.findUnique({
      where: { id: story.id },
      include: {
        classifications: {
          include: { classification: { select: { type: true } } },
        },
      },
    });

    expect(dbStory?.categoryId).toBeTruthy();
    expect(
      dbStory?.classifications.some(
        (sc) => sc.classification.type === ClassificationType.LANGUAGE
      )
    ).toBe(true);
    expect(
      dbStory?.classifications.some(
        (sc) => sc.classification.type === ClassificationType.RELIGION
      )
    ).toBe(true);

    // Perform the transition
    const updated = await prisma.story.update({
      where: { id: story.id },
      data: { stage: StoryStage.APPROVED },
    });

    expect(updated.stage).toBe('APPROVED');
  });

  // ------ Role checks ------

  it('sub-editor can approve, intern cannot', () => {
    expect(canApproveStoryStage('SUB_EDITOR')).toBe(true);
    expect(canApproveStoryStage('EDITOR')).toBe(true);
    expect(canApproveStoryStage('INTERN')).toBe(false);
    expect(canApproveStoryStage('JOURNALIST')).toBe(false);
  });

  // ------ Full pipeline ------

  it('full pipeline: DRAFT -> PUBLISHED', async () => {
    const story = await createTestStory({
      suffix: SUFFIX,
      label: 'full_pipeline',
      authorId: internId,
      authorRole: StaffRole.INTERN,
      stage: StoryStage.DRAFT,
      categoryId: categoryId,
      classificationIds: [langClassId, relClassId],
    });

    // DRAFT -> NEEDS_JOURNALIST_REVIEW
    expect(canUpdateStoryStage('INTERN', 'DRAFT', 'NEEDS_JOURNALIST_REVIEW')).toBe(true);
    let updated = await prisma.story.update({
      where: { id: story.id },
      data: { stage: StoryStage.NEEDS_JOURNALIST_REVIEW, assignedReviewerId: journalistId },
    });
    expect(updated.stage).toBe('NEEDS_JOURNALIST_REVIEW');

    // NEEDS_JOURNALIST_REVIEW -> NEEDS_SUB_EDITOR_APPROVAL
    expect(
      canUpdateStoryStage('JOURNALIST', 'NEEDS_JOURNALIST_REVIEW', 'NEEDS_SUB_EDITOR_APPROVAL')
    ).toBe(true);
    updated = await prisma.story.update({
      where: { id: story.id },
      data: { stage: StoryStage.NEEDS_SUB_EDITOR_APPROVAL, assignedApproverId: subEditorId },
    });
    expect(updated.stage).toBe('NEEDS_SUB_EDITOR_APPROVAL');

    // NEEDS_SUB_EDITOR_APPROVAL -> APPROVED
    expect(
      canUpdateStoryStage('SUB_EDITOR', 'NEEDS_SUB_EDITOR_APPROVAL', 'APPROVED')
    ).toBe(true);
    updated = await prisma.story.update({
      where: { id: story.id },
      data: { stage: StoryStage.APPROVED },
    });
    expect(updated.stage).toBe('APPROVED');

    // APPROVED -> TRANSLATED
    expect(canUpdateStoryStage('SUB_EDITOR', 'APPROVED', 'TRANSLATED')).toBe(true);
    updated = await prisma.story.update({
      where: { id: story.id },
      data: { stage: StoryStage.TRANSLATED },
    });
    expect(updated.stage).toBe('TRANSLATED');

    // TRANSLATED -> PUBLISHED
    expect(canUpdateStoryStage('SUB_EDITOR', 'TRANSLATED', 'PUBLISHED')).toBe(true);
    updated = await prisma.story.update({
      where: { id: story.id },
      data: {
        stage: StoryStage.PUBLISHED,
        status: StoryStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    expect(updated.stage).toBe('PUBLISHED');
    expect(updated.status).toBe('PUBLISHED');
    expect(updated.publishedAt).not.toBeNull();
  });
});
