import { StaffRole, StoryStatus, StoryStage } from '@prisma/client';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

// Story permissions matrix
const storyPermissions = {
  INTERN: {
    actions: ['create', 'read', 'update'],
    statusTransitions: {
      [StoryStatus.DRAFT]: [StoryStatus.IN_REVIEW],
      [StoryStatus.NEEDS_REVISION]: [StoryStatus.IN_REVIEW],
    },
    canEditOwnOnly: true,
    canDelete: false,
    canApprove: false,
    canPublish: false,
  },
  JOURNALIST: {
    actions: ['create', 'read', 'update'],
    statusTransitions: {
      [StoryStatus.DRAFT]: [StoryStatus.PENDING_APPROVAL], // Submit directly for approval
      [StoryStatus.IN_REVIEW]: [StoryStatus.NEEDS_REVISION, StoryStatus.PENDING_APPROVAL], // Review intern stories
      [StoryStatus.NEEDS_REVISION]: [StoryStatus.IN_REVIEW], // Can resubmit after making revisions
      [StoryStatus.PENDING_TRANSLATION]: [StoryStatus.READY_TO_PUBLISH], // Mark translation ready
    },
    canEditOwnOnly: true,
    canDelete: false,
    canApprove: false,
    canPublish: false,
  },
  SUB_EDITOR: {
    actions: ['create', 'read', 'update'],
    statusTransitions: {
      [StoryStatus.DRAFT]: [StoryStatus.IN_REVIEW],
      [StoryStatus.IN_REVIEW]: [StoryStatus.NEEDS_REVISION, StoryStatus.PENDING_APPROVAL],
      [StoryStatus.NEEDS_REVISION]: [StoryStatus.IN_REVIEW],
      [StoryStatus.PENDING_APPROVAL]: [StoryStatus.APPROVED, StoryStatus.NEEDS_REVISION],
      [StoryStatus.APPROVED]: [StoryStatus.NEEDS_REVISION, StoryStatus.PENDING_TRANSLATION],
      [StoryStatus.PENDING_TRANSLATION]: [StoryStatus.READY_TO_PUBLISH, StoryStatus.NEEDS_REVISION],
      [StoryStatus.READY_TO_PUBLISH]: [StoryStatus.PUBLISHED, StoryStatus.NEEDS_REVISION],
    },
    canEditOwnOnly: false,
    canDelete: false,
    canApprove: true,
    canPublish: true,
  },
  EDITOR: {
    actions: ['create', 'read', 'update', 'delete'],
    statusTransitions: {
      [StoryStatus.DRAFT]: [StoryStatus.IN_REVIEW, StoryStatus.PENDING_APPROVAL],
      [StoryStatus.IN_REVIEW]: [StoryStatus.NEEDS_REVISION, StoryStatus.PENDING_APPROVAL],
      [StoryStatus.NEEDS_REVISION]: [StoryStatus.IN_REVIEW, StoryStatus.PENDING_APPROVAL],
      [StoryStatus.PENDING_APPROVAL]: [StoryStatus.APPROVED, StoryStatus.NEEDS_REVISION],
      [StoryStatus.APPROVED]: [StoryStatus.NEEDS_REVISION, StoryStatus.PENDING_TRANSLATION, StoryStatus.ARCHIVED],
      [StoryStatus.PENDING_TRANSLATION]: [StoryStatus.READY_TO_PUBLISH, StoryStatus.NEEDS_REVISION, StoryStatus.ARCHIVED],
      [StoryStatus.READY_TO_PUBLISH]: [StoryStatus.PUBLISHED, StoryStatus.NEEDS_REVISION, StoryStatus.ARCHIVED],
      [StoryStatus.PUBLISHED]: [StoryStatus.ARCHIVED],
    },
    canEditOwnOnly: false,
    canDelete: true,
    canApprove: true,
    canPublish: true,
  },
  ADMIN: {
    actions: ['create', 'read', 'update', 'delete'],
    statusTransitions: {
      [StoryStatus.DRAFT]: Object.values(StoryStatus),
      [StoryStatus.IN_REVIEW]: Object.values(StoryStatus),
      [StoryStatus.NEEDS_REVISION]: Object.values(StoryStatus),
      [StoryStatus.PENDING_APPROVAL]: Object.values(StoryStatus),
      [StoryStatus.APPROVED]: Object.values(StoryStatus),
      [StoryStatus.PENDING_TRANSLATION]: Object.values(StoryStatus),
      [StoryStatus.READY_TO_PUBLISH]: Object.values(StoryStatus),
      [StoryStatus.PUBLISHED]: Object.values(StoryStatus),
      [StoryStatus.ARCHIVED]: Object.values(StoryStatus),
    },
    canEditOwnOnly: false,
    canDelete: true,
    canApprove: true,
    canPublish: true,
  },
  SUPERADMIN: {
    actions: ['create', 'read', 'update', 'delete'],
    statusTransitions: {
      [StoryStatus.DRAFT]: Object.values(StoryStatus),
      [StoryStatus.IN_REVIEW]: Object.values(StoryStatus),
      [StoryStatus.NEEDS_REVISION]: Object.values(StoryStatus),
      [StoryStatus.PENDING_APPROVAL]: Object.values(StoryStatus),
      [StoryStatus.APPROVED]: Object.values(StoryStatus),
      [StoryStatus.PENDING_TRANSLATION]: Object.values(StoryStatus),
      [StoryStatus.READY_TO_PUBLISH]: Object.values(StoryStatus),
      [StoryStatus.PUBLISHED]: Object.values(StoryStatus),
      [StoryStatus.ARCHIVED]: Object.values(StoryStatus),
    },
    canEditOwnOnly: false,
    canDelete: true,
    canApprove: true,
    canPublish: true,
  },
};

export function hasStoryPermission(userRole: StaffRole | null, action: PermissionAction): boolean {
  if (!userRole) return false;
  return storyPermissions[userRole]?.actions.includes(action) || false;
}

export function canUpdateStoryStatus(userRole: StaffRole | null, currentStatus: StoryStatus, newStatus: StoryStatus): boolean {
  if (!userRole) return false;
  const permissions = storyPermissions[userRole];
  const transitions = (permissions?.statusTransitions as any)?.[currentStatus];
  
  // Check if the transition is generally allowed
  if (!transitions?.includes(newStatus)) return false;
  
  return true;
}

export function canEditStory(userRole: StaffRole | null, storyAuthorId: string, currentUserId: string, storyStatus: StoryStatus): boolean {
  if (!userRole) return false;
  const permissions = storyPermissions[userRole];
  
  // Stories in review cannot be edited by anyone
  if (storyStatus === StoryStatus.IN_REVIEW) {
    return false;
  }
  
  // Stories pending approval cannot be edited by anyone
  if (storyStatus === StoryStatus.PENDING_APPROVAL) {
    return false;
  }
  
  // Stories that are approved, published, or in translation workflow cannot be edited
  if (storyStatus === StoryStatus.APPROVED || 
      storyStatus === StoryStatus.PUBLISHED ||
      storyStatus === StoryStatus.PENDING_TRANSLATION ||
      storyStatus === StoryStatus.READY_TO_PUBLISH) {
    return false;
  }
  
  // Stories in NEEDS_REVISION can be edited by the author (interns or journalists)
  if (storyStatus === StoryStatus.NEEDS_REVISION) {
    return storyAuthorId === currentUserId;
  }
  
  if (permissions.canEditOwnOnly) {
    return storyAuthorId === currentUserId;
  }
  
  return true;
}

export function canDeleteStory(userRole: StaffRole | null): boolean {
  if (!userRole) return false;
  return storyPermissions[userRole]?.canDelete || false;
}

export function canApproveStory(userRole: StaffRole | null): boolean {
  if (!userRole) return false;
  return storyPermissions[userRole]?.canApprove || false;
}

export function canPublishStory(userRole: StaffRole | null): boolean {
  if (!userRole) return false;
  return storyPermissions[userRole]?.canPublish || false;
}

export function getAvailableStatusTransitions(userRole: StaffRole | null, currentStatus: StoryStatus): StoryStatus[] {
  if (!userRole) return [];
  const permissions = storyPermissions[userRole];
  return (permissions?.statusTransitions as any)?.[currentStatus] || [];
}

export function getEditLockReason(storyStatus: StoryStatus): string | null {
  switch (storyStatus) {
    case StoryStatus.IN_REVIEW:
      return 'Story is currently under review and cannot be edited';
    case StoryStatus.PENDING_APPROVAL:
      return 'Story is pending approval and cannot be edited';
    case StoryStatus.NEEDS_REVISION:
      return 'Story needs revision and can only be edited by the author';
    case StoryStatus.APPROVED:
      return 'Story has been approved and cannot be edited';
    case StoryStatus.PENDING_TRANSLATION:
      return 'Story is pending translation and cannot be edited';
    case StoryStatus.READY_TO_PUBLISH:
      return 'Story is ready to publish and cannot be edited';
    case StoryStatus.PUBLISHED:
      return 'Story has been published and cannot be edited';
    default:
      return null;
  }
}

// Comment permissions
const commentPermissions = {
  INTERN: ['create', 'read', 'update'],
  JOURNALIST: ['create', 'read', 'update'],
  SUB_EDITOR: ['create', 'read', 'update', 'delete'],
  EDITOR: ['create', 'read', 'update', 'delete'],
  ADMIN: ['create', 'read', 'update', 'delete'],
  SUPERADMIN: ['create', 'read', 'update', 'delete'],
};

export function hasCommentPermission(userRole: StaffRole | null, action: PermissionAction): boolean {
  if (!userRole) return false;
  return commentPermissions[userRole]?.includes(action) || false;
}

// Category permissions
const categoryPermissions = {
  INTERN: ['read'],
  JOURNALIST: ['read'],
  SUB_EDITOR: ['create', 'read', 'update'],
  EDITOR: ['create', 'read', 'update', 'delete'],
  ADMIN: ['create', 'read', 'update', 'delete'],
  SUPERADMIN: ['create', 'read', 'update', 'delete'],
};

export function hasCategoryPermission(userRole: StaffRole | null, action: PermissionAction): boolean {
  if (!userRole) return false;
  return categoryPermissions[userRole]?.includes(action) || false;
}

// Tag permissions
const tagPermissions = {
  INTERN: ['read'],
  JOURNALIST: ['read'],
  SUB_EDITOR: ['create', 'read', 'update'],
  EDITOR: ['create', 'read', 'update', 'delete'],
  ADMIN: ['create', 'read', 'update', 'delete'],
  SUPERADMIN: ['create', 'read', 'update', 'delete'],
};

export function hasTagPermission(userRole: StaffRole | null, action: PermissionAction): boolean {
  if (!userRole) return false;
  return tagPermissions[userRole]?.includes(action) || false;
}

// Translation permissions
const translationPermissions = {
  INTERN: ['read'],
  JOURNALIST: ['read'],
  SUB_EDITOR: ['create', 'read', 'update', 'approve'],
  EDITOR: ['create', 'read', 'update', 'delete', 'approve'],
  ADMIN: ['create', 'read', 'update', 'delete', 'approve'],
  SUPERADMIN: ['create', 'read', 'update', 'delete', 'approve'],
};

export function hasTranslationPermission(userRole: StaffRole | null, action: PermissionAction | 'approve'): boolean {
  if (!userRole) return false;
  return translationPermissions[userRole]?.includes(action) || false;
}

export function canApproveTranslation(userRole: StaffRole | null): boolean {
  if (!userRole) return false;
  return ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
}

export function canWorkOnTranslation(userRole: StaffRole | null, translationAssignedToId: string, currentUserId: string): boolean {
  if (!userRole) return false;
  // Only the assigned translator or higher roles can work on translation
  if (translationAssignedToId === currentUserId) return true;
  return ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
}

// ============================================================================
// NEW STAGE-BASED PERMISSIONS (Simplified Workflow)
// ============================================================================

/**
 * Check if user can edit a story based on stage
 */
export function canEditStoryByStage(
  userRole: StaffRole | null,
  stage: StoryStage | null,
  storyAuthorId: string,
  currentUserId: string
): boolean {
  if (!userRole || !stage) return false;

  // Editors and above can edit any story in DRAFT
  if (stage === 'DRAFT' && ['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
    return true;
  }

  // Stories in DRAFT can be edited by author
  if (stage === 'DRAFT') {
    return storyAuthorId === currentUserId;
  }

  // Stories in review/approval stages are locked
  if (stage === 'NEEDS_JOURNALIST_REVIEW' || stage === 'NEEDS_SUB_EDITOR_APPROVAL') {
    return false;
  }

  // Stories that are approved, translated, or published are locked
  if (stage === 'APPROVED' || stage === 'TRANSLATED' || stage === 'PUBLISHED') {
    return false;
  }

  return false;
}

/**
 * Check if user can review a story (journalist reviewing intern work)
 */
export function canReviewStory(userRole: StaffRole | null): boolean {
  if (!userRole) return false;
  return ['JOURNALIST', 'SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
}

/**
 * Check if user can approve a story (sub-editor final approval)
 */
export function canApproveStoryStage(userRole: StaffRole | null): boolean {
  if (!userRole) return false;
  return ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
}

/**
 * Check if user can send story for translation
 */
export function canSendForTranslation(userRole: StaffRole | null): boolean {
  if (!userRole) return false;
  return ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
}

/**
 * Check if user can request revision
 */
export function canRequestRevision(
  userRole: StaffRole | null,
  stage: StoryStage | null,
  assignedReviewerId: string | null,
  assignedApproverId: string | null,
  currentUserId: string
): boolean {
  if (!userRole || !stage) return false;

  // Journalist can request revision if they're the assigned reviewer
  if (stage === 'NEEDS_JOURNALIST_REVIEW') {
    if (assignedReviewerId === currentUserId && canReviewStory(userRole)) {
      return true;
    }
  }

  // Sub-editor can request revision if they're the assigned approver
  if (stage === 'NEEDS_SUB_EDITOR_APPROVAL') {
    if (assignedApproverId === currentUserId && canApproveStoryStage(userRole)) {
      return true;
    }
  }

  // Editors and above can always request revision
  return ['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
}

/**
 * Get the next stage action for a story based on author role
 */
export function getNextStageAction(
  authorRole: StaffRole | null,
  currentStage: StoryStage | null,
  userRole: StaffRole | null
): {
  action: string;
  label: string;
  requiresAssignment: boolean;
  assignmentRole?: StaffRole[];
} | null {
  if (!authorRole || !currentStage || !userRole) return null;

  // INTERN story path
  if (authorRole === 'INTERN') {
    if (currentStage === 'DRAFT') {
      return {
        action: 'submit_for_review',
        label: 'Submit for Review',
        requiresAssignment: true,
        assignmentRole: ['JOURNALIST'],
      };
    }
    if (currentStage === 'NEEDS_JOURNALIST_REVIEW' && canReviewStory(userRole)) {
      return {
        action: 'send_for_approval',
        label: 'Send for Approval',
        requiresAssignment: true,
        assignmentRole: ['SUB_EDITOR', 'EDITOR'],
      };
    }
  }

  // JOURNALIST story path
  if (authorRole === 'JOURNALIST') {
    if (currentStage === 'DRAFT') {
      return {
        action: 'submit_for_approval',
        label: 'Submit for Approval',
        requiresAssignment: true,
        assignmentRole: ['SUB_EDITOR', 'EDITOR'],
      };
    }
  }

  // SUB_EDITOR/EDITOR story path (can self-approve)
  if (['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(authorRole)) {
    if (currentStage === 'DRAFT' && canApproveStoryStage(userRole)) {
      return {
        action: 'approve_story',
        label: 'Approve Story',
        requiresAssignment: false,
      };
    }
  }

  // Approval stage
  if (currentStage === 'NEEDS_SUB_EDITOR_APPROVAL' && canApproveStoryStage(userRole)) {
    return {
      action: 'approve_story',
      label: 'Approve Story',
      requiresAssignment: false,
    };
  }

  // Translation stage
  if (currentStage === 'APPROVED' && canSendForTranslation(userRole)) {
    return {
      action: 'send_for_translation',
      label: 'Send for Translation',
      requiresAssignment: true,
      assignmentRole: ['JOURNALIST', 'SUB_EDITOR', 'EDITOR'],
    };
  }

  // Publishing stage
  if (currentStage === 'TRANSLATED' && canPublishStory(userRole)) {
    return {
      action: 'publish_story',
      label: 'Publish Story',
      requiresAssignment: false,
    };
  }

  return null;
}

/**
 * Get stage-specific lock reason
 */
export function getStageLockReason(stage: StoryStage | null): string | null {
  if (!stage) return null;

  switch (stage) {
    case 'NEEDS_JOURNALIST_REVIEW':
      return 'Story is under review by a journalist';
    case 'NEEDS_SUB_EDITOR_APPROVAL':
      return 'Story is awaiting sub-editor approval';
    case 'APPROVED':
      return 'Story has been approved and is ready for translation';
    case 'TRANSLATED':
      return 'Story translations are complete and ready to publish';
    case 'PUBLISHED':
      return 'Story has been published';
    default:
      return null;
  }
} 