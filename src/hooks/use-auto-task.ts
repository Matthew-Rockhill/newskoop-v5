'use client';

import { useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface AutoTaskOptions {
  contentType: 'story' | 'bulletin' | 'show';
  contentId: string;
  contentTitle: string;
  redirectToWork?: boolean;
}

interface CreateAutoTaskData {
  type: 'STORY_CREATE' | 'BULLETIN_CREATE' | 'SHOW_CREATE';
  title: string;
  description: string;
  status: 'IN_PROGRESS';
  priority: 'MEDIUM';
  assignedToId: string;
  contentId: string;
  contentType: string;
}

export function useAutoTask() {
  const { data: session } = useSession();

  const createAutoTask = useMutation({
    mutationFn: async (data: CreateAutoTaskData) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create auto-task');
      }

      return response.json();
    },
  });

  const generateAutoTask = async ({ 
    contentType, 
    contentId, 
    contentTitle, 
    redirectToWork = true 
  }: AutoTaskOptions) => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    const taskTypeMap = {
      story: 'STORY_CREATE' as const,
      bulletin: 'BULLETIN_CREATE' as const,
      show: 'SHOW_CREATE' as const,
    };

    const taskData: CreateAutoTaskData = {
      type: taskTypeMap[contentType],
      title: `Complete ${contentType}: ${contentTitle}`,
      description: `Auto-generated task for ${contentType} created outside the task system. Complete the work and mark as done.`,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assignedToId: session.user.id,
      contentId,
      contentType,
    };

    const result = await createAutoTask.mutateAsync(taskData);

    if (redirectToWork) {
      // Redirect to work interface
      window.location.href = `/admin/newsroom/tasks/${result.task.id}/work`;
    }

    return result;
  };

  return {
    generateAutoTask,
    isLoading: createAutoTask.isPending,
    error: createAutoTask.error,
  };
}

// Utility function to be called when content is created standalone
export const createContentWithAutoTask = async (
  contentType: 'story' | 'bulletin' | 'show',
  contentData: any,
  createContentFn: (data: any) => Promise<{ id: string; title: string }>
) => {
  // Create the content first
  const content = await createContentFn(contentData);

  // Then create auto-task
  const { generateAutoTask } = useAutoTask();
  await generateAutoTask({
    contentType,
    contentId: content.id,
    contentTitle: content.title,
  });

  return content;
}; 