import { StaffRole, StoryStatus } from '@prisma/client';

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
      [StoryStatus.NEEDS_REVISION]: [StoryStatus.PENDING_APPROVAL], // Submit for approval after editing
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
      [StoryStatus.APPROVED]: [StoryStatus.PUBLISHED, StoryStatus.NEEDS_REVISION],
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
      [StoryStatus.APPROVED]: [StoryStatus.PUBLISHED, StoryStatus.NEEDS_REVISION, StoryStatus.ARCHIVED],
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

export function canUpdateStoryStatus(userRole: StaffRole | null, currentStatus: StoryStatus, newStatus: StoryStatus, storyAuthorId?: string, currentUserId?: string): boolean {
  if (!userRole) return false;
  const transitions = storyPermissions[userRole]?.statusTransitions[currentStatus];
  
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
  
  // Stories that are approved or published cannot be edited
  if (storyStatus === StoryStatus.APPROVED || storyStatus === StoryStatus.PUBLISHED) {
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
  return storyPermissions[userRole]?.statusTransitions[currentStatus] || [];
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
    case StoryStatus.PUBLISHED:
      return 'Story has been published and cannot be edited';
    default:
      return null;
  }
}

// Comment permissions
const commentPermissions = {
  INTERN: ['create', 'read'],
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
  JOURNALIST: ['create', 'read'],
  SUB_EDITOR: ['create', 'read', 'update', 'delete'],
  EDITOR: ['create', 'read', 'update', 'delete'],
  ADMIN: ['create', 'read', 'update', 'delete'],
  SUPERADMIN: ['create', 'read', 'update', 'delete'],
};

export function hasTagPermission(userRole: StaffRole | null, action: PermissionAction): boolean {
  if (!userRole) return false;
  return tagPermissions[userRole]?.includes(action) || false;
} 