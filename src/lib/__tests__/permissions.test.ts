import { describe, it, expect } from 'vitest';
import {
  hasStoryPermission,
  canUpdateStoryStatus,
  canEditStory,
  canDeleteStoryByStage,
  canApproveStory,
  canPublishStory,
  canReviewStory,
  canApproveStoryStage,
  canEditStoryByStage,
  hasCategoryPermission,
  hasTagPermission,
  canFlagStoryForBulletin,
  hasTranslationPermission,
  canApproveTranslation,
  canWorkOnTranslation,
  canSendForTranslation,
  canUpdateStoryStage,
  canRequestRevision,
  hasShowPermission,
  canManageShows,
  canPublishEpisode,
  canEditShow,
  canDeleteShow,
} from '../permissions';
import { StaffRole, StoryStatus, StoryStage } from '@prisma/client';

describe('Editorial Workflow Permissions', () => {
  describe('Intern Story Workflow', () => {
    const internRole = StaffRole.INTERN;
    const internId = 'intern-123';
    const otherId = 'other-456';

    it('Intern can create and read stories', () => {
      expect(hasStoryPermission(internRole, 'create')).toBe(true);
      expect(hasStoryPermission(internRole, 'read')).toBe(true);
    });

    it('Intern can edit their own draft', () => {
      expect(canEditStory(internRole, internId, internId, StoryStatus.DRAFT)).toBe(true);
    });

    it('Intern cannot edit another users draft', () => {
      expect(canEditStory(internRole, otherId, internId, StoryStatus.DRAFT)).toBe(false);
    });

    it('Intern can submit draft for review', () => {
      expect(canUpdateStoryStatus(internRole, StoryStatus.DRAFT, StoryStatus.IN_REVIEW)).toBe(true);
    });

    it('Intern cannot approve or publish', () => {
      expect(canApproveStory(internRole)).toBe(false);
      expect(canPublishStory(internRole)).toBe(false);
    });

    it('Intern can edit story sent back for revision', () => {
      expect(canEditStory(internRole, internId, internId, StoryStatus.NEEDS_REVISION)).toBe(true);
    });

    it('Intern cannot edit story while in review', () => {
      expect(canEditStory(internRole, internId, internId, StoryStatus.IN_REVIEW)).toBe(false);
    });

    it('Intern can delete their own draft only', () => {
      expect(canDeleteStoryByStage(internRole, StoryStage.DRAFT, internId, internId)).toBe(true);
      expect(canDeleteStoryByStage(internRole, StoryStage.PUBLISHED, internId, internId)).toBe(false);
    });
  });

  describe('Journalist Review Workflow', () => {
    const journalistRole = StaffRole.JOURNALIST;
    const journalistId = 'journalist-123';

    it('Journalist can review intern stories', () => {
      expect(canReviewStory(journalistRole)).toBe(true);
    });

    it('Journalist can send stories for approval', () => {
      expect(canUpdateStoryStatus(journalistRole, StoryStatus.IN_REVIEW, StoryStatus.PENDING_APPROVAL)).toBe(true);
    });

    it('Journalist can request revision on intern stories', () => {
      expect(canUpdateStoryStatus(journalistRole, StoryStatus.IN_REVIEW, StoryStatus.NEEDS_REVISION)).toBe(true);
    });

    it('Journalist cannot approve or publish', () => {
      expect(canApproveStory(journalistRole)).toBe(false);
      expect(canPublishStory(journalistRole)).toBe(false);
    });

    it('Journalist can delete their own draft', () => {
      expect(canDeleteStoryByStage(journalistRole, StoryStage.DRAFT, journalistId, journalistId)).toBe(true);
    });
  });

  describe('Sub-Editor Approval Workflow', () => {
    const subEditorRole = StaffRole.SUB_EDITOR;
    const authorId = 'author-456';
    const subEditorId = 'subeditor-123';

    it('Sub-Editor can approve stories', () => {
      expect(canApproveStory(subEditorRole)).toBe(true);
      expect(canApproveStoryStage(subEditorRole)).toBe(true);
    });

    it('Sub-Editor can publish stories', () => {
      expect(canPublishStory(subEditorRole)).toBe(true);
    });

    it('Sub-Editor can edit any story at any stage', () => {
      expect(canEditStory(subEditorRole, authorId, subEditorId, StoryStatus.IN_REVIEW)).toBe(true);
      expect(canEditStoryByStage(subEditorRole, StoryStage.APPROVED, authorId, subEditorId)).toBe(true);
    });

    it('Sub-Editor can delete any story', () => {
      expect(canDeleteStoryByStage(subEditorRole, StoryStage.PUBLISHED, authorId, subEditorId)).toBe(true);
    });

    it('Sub-Editor can flag stories for bulletin', () => {
      expect(canFlagStoryForBulletin(subEditorRole)).toBe(true);
    });

    it('Sub-Editor can manage categories', () => {
      expect(hasCategoryPermission(subEditorRole, 'create')).toBe(true);
      expect(hasCategoryPermission(subEditorRole, 'update')).toBe(true);
    });
  });

  describe('Editor Full Access', () => {
    const editorRole = StaffRole.EDITOR;

    it('Editor has full story CRUD permissions', () => {
      expect(hasStoryPermission(editorRole, 'create')).toBe(true);
      expect(hasStoryPermission(editorRole, 'read')).toBe(true);
      expect(hasStoryPermission(editorRole, 'update')).toBe(true);
      expect(hasStoryPermission(editorRole, 'delete')).toBe(true);
    });

    it('Editor can archive published stories', () => {
      expect(canUpdateStoryStatus(editorRole, StoryStatus.PUBLISHED, StoryStatus.ARCHIVED)).toBe(true);
    });

    it('Editor can manage categories and tags', () => {
      expect(hasCategoryPermission(editorRole, 'delete')).toBe(true);
      expect(hasTagPermission(editorRole, 'delete')).toBe(true);
    });
  });

  describe('Admin Override Capabilities', () => {
    it('Admin can transition story to any status', () => {
      expect(canUpdateStoryStatus(StaffRole.ADMIN, StoryStatus.DRAFT, StoryStatus.PUBLISHED)).toBe(true);
    });

    it('SuperAdmin can transition story to any status', () => {
      expect(canUpdateStoryStatus(StaffRole.SUPERADMIN, StoryStatus.DRAFT, StoryStatus.ARCHIVED)).toBe(true);
    });
  });
});

describe('Translation Workflow', () => {
  describe('Translation Permissions by Role', () => {
    it('Intern can only read translations', () => {
      expect(hasTranslationPermission(StaffRole.INTERN, 'read')).toBe(true);
      expect(hasTranslationPermission(StaffRole.INTERN, 'create')).toBe(false);
    });

    it('Journalist can only read translations', () => {
      expect(hasTranslationPermission(StaffRole.JOURNALIST, 'read')).toBe(true);
      expect(hasTranslationPermission(StaffRole.JOURNALIST, 'create')).toBe(false);
    });

    it('Sub-Editor can create and approve translations', () => {
      expect(hasTranslationPermission(StaffRole.SUB_EDITOR, 'create')).toBe(true);
      expect(hasTranslationPermission(StaffRole.SUB_EDITOR, 'approve')).toBe(true);
      expect(canApproveTranslation(StaffRole.SUB_EDITOR)).toBe(true);
    });

    it('Editor has full translation permissions', () => {
      expect(hasTranslationPermission(StaffRole.EDITOR, 'create')).toBe(true);
      expect(hasTranslationPermission(StaffRole.EDITOR, 'delete')).toBe(true);
      expect(hasTranslationPermission(StaffRole.EDITOR, 'approve')).toBe(true);
    });
  });

  describe('Translation Assignment', () => {
    const translatorId = 'translator-123';
    const otherId = 'other-456';

    it('Assigned translator can work on translation', () => {
      expect(canWorkOnTranslation(StaffRole.JOURNALIST, translatorId, translatorId)).toBe(true);
    });

    it('Non-assigned lower role cannot work on translation', () => {
      expect(canWorkOnTranslation(StaffRole.JOURNALIST, translatorId, otherId)).toBe(false);
    });

    it('Sub-Editor can work on any translation', () => {
      expect(canWorkOnTranslation(StaffRole.SUB_EDITOR, translatorId, otherId)).toBe(true);
    });
  });

  describe('Send for Translation', () => {
    it('Lower roles cannot send for translation', () => {
      expect(canSendForTranslation(StaffRole.INTERN)).toBe(false);
      expect(canSendForTranslation(StaffRole.JOURNALIST)).toBe(false);
    });

    it('Sub-Editor and above can send for translation', () => {
      expect(canSendForTranslation(StaffRole.SUB_EDITOR)).toBe(true);
      expect(canSendForTranslation(StaffRole.EDITOR)).toBe(true);
    });
  });
});

describe('Stage-Based Story Workflow', () => {
  describe('Intern Stage Transitions', () => {
    it('Intern can submit draft for journalist review', () => {
      expect(canUpdateStoryStage(StaffRole.INTERN, StoryStage.DRAFT, StoryStage.NEEDS_JOURNALIST_REVIEW)).toBe(true);
    });

    it('Intern cannot skip to sub-editor approval', () => {
      expect(canUpdateStoryStage(StaffRole.INTERN, StoryStage.DRAFT, StoryStage.NEEDS_SUB_EDITOR_APPROVAL)).toBe(false);
    });

    it('Intern cannot approve their own story', () => {
      expect(canUpdateStoryStage(StaffRole.INTERN, StoryStage.DRAFT, StoryStage.APPROVED)).toBe(false);
    });
  });

  describe('Journalist Stage Transitions', () => {
    it('Journalist can submit directly for approval', () => {
      expect(canUpdateStoryStage(StaffRole.JOURNALIST, StoryStage.DRAFT, StoryStage.NEEDS_SUB_EDITOR_APPROVAL)).toBe(true);
    });

    it('Journalist can approve reviewed story to sub-editor', () => {
      expect(canUpdateStoryStage(StaffRole.JOURNALIST, StoryStage.NEEDS_JOURNALIST_REVIEW, StoryStage.NEEDS_SUB_EDITOR_APPROVAL)).toBe(true);
    });

    it('Journalist can send back for revision', () => {
      expect(canUpdateStoryStage(StaffRole.JOURNALIST, StoryStage.NEEDS_JOURNALIST_REVIEW, StoryStage.DRAFT)).toBe(true);
    });
  });

  describe('Sub-Editor Stage Transitions', () => {
    it('Sub-Editor can approve story', () => {
      expect(canUpdateStoryStage(StaffRole.SUB_EDITOR, StoryStage.NEEDS_SUB_EDITOR_APPROVAL, StoryStage.APPROVED)).toBe(true);
    });

    it('Sub-Editor can send for translation', () => {
      expect(canUpdateStoryStage(StaffRole.SUB_EDITOR, StoryStage.APPROVED, StoryStage.TRANSLATED)).toBe(true);
    });

    it('Sub-Editor can publish translated story', () => {
      expect(canUpdateStoryStage(StaffRole.SUB_EDITOR, StoryStage.TRANSLATED, StoryStage.PUBLISHED)).toBe(true);
    });
  });

  describe('Revision Requests', () => {
    const reviewerId = 'reviewer-123';
    const approverId = 'approver-456';
    const otherId = 'other-789';

    it('Assigned reviewer can request revision', () => {
      expect(canRequestRevision(StaffRole.JOURNALIST, StoryStage.NEEDS_JOURNALIST_REVIEW, reviewerId, null, reviewerId)).toBe(true);
    });

    it('Non-assigned journalist cannot request revision', () => {
      expect(canRequestRevision(StaffRole.JOURNALIST, StoryStage.NEEDS_JOURNALIST_REVIEW, reviewerId, null, otherId)).toBe(false);
    });

    it('Editor can always request revision', () => {
      expect(canRequestRevision(StaffRole.EDITOR, StoryStage.NEEDS_JOURNALIST_REVIEW, reviewerId, null, otherId)).toBe(true);
    });
  });
});

describe('Bulletin & Flagging', () => {
  it('Lower roles cannot flag stories for bulletin', () => {
    expect(canFlagStoryForBulletin(StaffRole.INTERN)).toBe(false);
    expect(canFlagStoryForBulletin(StaffRole.JOURNALIST)).toBe(false);
  });

  it('Sub-Editor and above can flag stories', () => {
    expect(canFlagStoryForBulletin(StaffRole.SUB_EDITOR)).toBe(true);
    expect(canFlagStoryForBulletin(StaffRole.EDITOR)).toBe(true);
    expect(canFlagStoryForBulletin(StaffRole.ADMIN)).toBe(true);
  });
});

describe('Shows & Episodes (Podcasts)', () => {
  describe('Show Permissions', () => {
    it('Lower roles can only view shows', () => {
      expect(hasShowPermission(StaffRole.INTERN, 'read')).toBe(true);
      expect(hasShowPermission(StaffRole.INTERN, 'create')).toBe(false);
      expect(hasShowPermission(StaffRole.JOURNALIST, 'create')).toBe(false);
    });

    it('Sub-Editor can manage shows', () => {
      expect(hasShowPermission(StaffRole.SUB_EDITOR, 'create')).toBe(true);
      expect(hasShowPermission(StaffRole.SUB_EDITOR, 'update')).toBe(true);
      expect(canManageShows(StaffRole.SUB_EDITOR)).toBe(true);
    });
  });

  describe('Episode Publishing', () => {
    it('Lower roles cannot publish episodes', () => {
      expect(canPublishEpisode(StaffRole.INTERN)).toBe(false);
      expect(canPublishEpisode(StaffRole.JOURNALIST)).toBe(false);
    });

    it('Sub-Editor and above can publish episodes', () => {
      expect(canPublishEpisode(StaffRole.SUB_EDITOR)).toBe(true);
      expect(canPublishEpisode(StaffRole.EDITOR)).toBe(true);
    });
  });

  describe('Show Editing', () => {
    const creatorId = 'creator-123';
    const otherId = 'other-456';

    it('Sub-Editor can only edit their own shows', () => {
      expect(canEditShow(StaffRole.SUB_EDITOR, creatorId, creatorId)).toBe(true);
      expect(canEditShow(StaffRole.SUB_EDITOR, creatorId, otherId)).toBe(false);
    });

    it('Editor can edit any show', () => {
      expect(canEditShow(StaffRole.EDITOR, creatorId, otherId)).toBe(true);
    });
  });

  describe('Show Deletion', () => {
    it('Sub-Editor cannot delete shows', () => {
      expect(canDeleteShow(StaffRole.SUB_EDITOR)).toBe(false);
    });

    it('Editor and above can delete shows', () => {
      expect(canDeleteShow(StaffRole.EDITOR)).toBe(true);
      expect(canDeleteShow(StaffRole.ADMIN)).toBe(true);
    });
  });
});

describe('Security - Null Role Handling', () => {
  it('Null role has no permissions', () => {
    expect(hasStoryPermission(null, 'create')).toBe(false);
    expect(canApproveStory(null)).toBe(false);
    expect(canPublishStory(null)).toBe(false);
    expect(canReviewStory(null)).toBe(false);
    expect(hasTranslationPermission(null, 'read')).toBe(false);
    expect(canFlagStoryForBulletin(null)).toBe(false);
    expect(hasShowPermission(null, 'read')).toBe(false);
  });
});
