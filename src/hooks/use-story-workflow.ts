import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TaskType, StoryStatus } from '@prisma/client';

interface CreateStoryWorkflowParams {
  storyId: string;
  storyTitle: string;
  authorId: string;
  language: string;
  assignReviewerTo?: string;
  autoAssignReviewer?: boolean;
}

interface StoryStatusChangeParams {
  storyId: string;
  storyTitle: string;
  fromStatus: StoryStatus;
  toStatus: StoryStatus;
  authorId: string;
  assignedToId?: string;
  reviewerId?: string;
  notes?: string;
}

// Workflow configuration
const WORKFLOW_CONFIG = {
  // Auto-assign reviewers based on content type or category
  autoReviewerAssignment: true,
  // Create follow-up tasks for published stories
  createFollowUpTasks: true,
  // Auto-create translation tasks for English stories
  autoCreateTranslations: true,
  // Required translations for English stories
  requiredTranslations: ['AFRIKAANS', 'XHOSA'],
};

async function createStoryWorkflow(params: CreateStoryWorkflowParams) {
  const response = await fetch('/api/tasks/workflow/story-created', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create story workflow');
  }

  return response.json();
}

async function handleStoryStatusChange(params: StoryStatusChangeParams) {
  const response = await fetch('/api/tasks/workflow/story-status-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to handle story status change');
  }

  return response.json();
}

// Generate task suggestions based on story state
export function generateTaskSuggestions(story: any, currentUser: any) {
  const suggestions = [];

  // Review task suggestions
  if (story.status === 'DRAFT' && !story.reviewerId) {
    suggestions.push({
      type: 'STORY_REVIEW' as TaskType,
      title: `Review: ${story.title}`,
      description: 'Review story content for accuracy and editorial standards',
      priority: 'MEDIUM',
      suggestedAssignee: 'JOURNALIST', // Role-based suggestion
    });
  }

  // Translation task suggestions
  if (story.status === 'APPROVED' && story.language === 'ENGLISH') {
    WORKFLOW_CONFIG.requiredTranslations.forEach(targetLang => {
      suggestions.push({
        type: 'STORY_TRANSLATE' as TaskType,
        title: `Translate to ${targetLang}: ${story.title}`,
        description: `Translate story from English to ${targetLang}`,
        priority: 'HIGH',
        sourceLanguage: 'ENGLISH',
        targetLanguage: targetLang,
        suggestedAssignee: 'TRANSLATOR', // Special role or by translation language
      });
    });
  }

  // Publishing task suggestions
  if (story.status === 'APPROVED' && currentUser.staffRole && ['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(currentUser.staffRole)) {
    suggestions.push({
      type: 'STORY_PUBLISH' as TaskType,
      title: `Publish: ${story.title}`,
      description: 'Final review and publish story',
      priority: 'HIGH',
      suggestedAssignee: 'EDITOR',
    });
  }

  return suggestions;
}

export function useStoryWorkflow() {
  const queryClient = useQueryClient();

  const createWorkflow = useMutation({
    mutationFn: createStoryWorkflow,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (data.tasksCreated > 0) {
        toast.success(`Story workflow created with ${data.tasksCreated} tasks`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleStatusChange = useMutation({
    mutationFn: handleStoryStatusChange,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      if (data.tasksCreated > 0) {
        toast.success(`Workflow updated with ${data.tasksCreated} new tasks`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Helper function to create initial workflow when story is created
  const initializeStoryWorkflow = async (story: any, options: {
    autoAssignReviewer?: boolean;
    assignReviewerTo?: string;
  } = {}) => {
    return createWorkflow.mutate({
      storyId: story.id,
      storyTitle: story.title,
      authorId: story.authorId,
      language: story.language,
      autoAssignReviewer: options.autoAssignReviewer ?? WORKFLOW_CONFIG.autoReviewerAssignment,
      assignReviewerTo: options.assignReviewerTo,
    });
  };

  // Helper function to handle story status transitions
  const processStatusChange = async (story: any, fromStatus: StoryStatus, toStatus: StoryStatus, options: {
    assignedToId?: string;
    reviewerId?: string;
    notes?: string;
  } = {}) => {
    return handleStatusChange.mutate({
      storyId: story.id,
      storyTitle: story.title,
      fromStatus,
      toStatus,
      authorId: story.authorId,
      assignedToId: options.assignedToId,
      reviewerId: options.reviewerId,
      notes: options.notes,
    });
  };

  // Get workflow status for a story
  const getWorkflowStatus = (story: any) => {
    const status = {
      canReview: story.status === 'DRAFT' && !story.reviewerId,
      canApprove: story.status === 'IN_REVIEW',
      canPublish: story.status === 'APPROVED',
      needsTranslation: story.status === 'APPROVED' && story.language === 'ENGLISH',
      isComplete: story.status === 'PUBLISHED',
    };

    return status;
  };

  return {
    initializeStoryWorkflow,
    processStatusChange,
    getWorkflowStatus,
    generateTaskSuggestions,
    isCreatingWorkflow: createWorkflow.isPending,
    isProcessingStatusChange: handleStatusChange.isPending,
  };
} 