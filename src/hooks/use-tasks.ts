import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Task, TaskFilters, TaskFormData, TaskType, TaskStatus, TaskPriority } from '@/types';

interface TasksResponse {
  tasks: Task[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

async function fetchTasks(filters: TaskFilters = {}): Promise<TasksResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });

  const response = await fetch(`/api/tasks?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  return response.json();
}

async function fetchTask(id: string): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch task');
  }
  return response.json();
}

async function createTask(data: TaskFormData): Promise<Task> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create task');
  }

  return response.json();
}

async function updateTask(id: string, data: Partial<TaskFormData>): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update task');
  }

  return response.json();
}

async function completeTask(id: string, metadata?: Record<string, unknown>): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to complete task');
  }

  return response.json();
}

async function assignTask(id: string, data: { assignedToId: string; dueDate?: Date; notes?: string }): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to assign task');
  }

  return response.json();
}

async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete task');
  }
}

// Hook for fetching multiple tasks
export function useTasks(initialFilters: TaskFilters = {}) {
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasks(filters),
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskFormData> }) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, metadata }: { id: string; metadata?: Record<string, unknown> }) =>
      completeTask(id, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task completed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { assignedToId: string; dueDate?: Date; notes?: string } }) =>
      assignTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    tasks: data?.tasks || [],
    pagination: data?.pagination,
    isLoading,
    error,
    filters,
    setFilters,
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    completeTask: completeMutation.mutateAsync,
    assignTask: assignMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isCompleting: completeMutation.isPending,
    isAssigning: assignMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for fetching a single task
export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchTask(id),
    enabled: !!id,
  });
}

// Hook for creating tasks with automatic workflow
export function useCreateTaskWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      type, 
      contentId, 
      assignedToId, 
      metadata 
    }: { 
      type: TaskType; 
      contentId?: string; 
      assignedToId: string; 
      metadata?: Record<string, unknown> 
    }) => {
      // Auto-generate task title and description based on type
      const taskData = generateTaskData(type, contentId, assignedToId, metadata);
      return createTask(taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Helper function to generate task data based on type
function generateTaskData(
  type: TaskType, 
  contentId?: string, 
  assignedToId?: string, 
  metadata?: Record<string, unknown>
): TaskFormData {
  const baseData: TaskFormData = {
    type,
    title: '',
    priority: 'MEDIUM' as TaskPriority,
    assignedToId: assignedToId || '',
    contentType: getContentTypeFromTaskType(type),
    contentId,
    metadata,
  };

  switch (type) {
    case 'STORY_CREATE':
      return {
        ...baseData,
        title: metadata?.storyTitle ? `Write: ${metadata.storyTitle}` : 'Write new story',
        description: metadata?.description as string || 'Create a new story',
      };
    
    case 'STORY_REVIEW':
      return {
        ...baseData,
        title: metadata?.storyTitle ? `Review: ${metadata.storyTitle}` : 'Review story',
        description: 'Review story content and provide feedback',
        priority: 'HIGH' as TaskPriority,
      };
    
    case 'STORY_APPROVAL':
      return {
        ...baseData,
        title: metadata?.storyTitle ? `Approve: ${metadata.storyTitle}` : 'Approve story',
        description: 'Complete approval checklist and approve story for publication',
        priority: 'HIGH' as TaskPriority,
      };
    
    case 'STORY_TRANSLATE':
      return {
        ...baseData,
        title: metadata?.storyTitle ? `Translate to ${metadata.targetLanguage}: ${metadata.storyTitle}` : 'Translate story',
        description: `Translate story from ${metadata?.sourceLanguage} to ${metadata?.targetLanguage}`,
        sourceLanguage: metadata?.sourceLanguage as string,
        targetLanguage: metadata?.targetLanguage as string,
      };
    
    default:
      return {
        ...baseData,
        title: `${type.replace(/_/g, ' ').toLowerCase()}`,
        description: `Complete ${type.replace(/_/g, ' ').toLowerCase()} task`,
      };
  }
}

function getContentTypeFromTaskType(type: TaskType): string {
  if (type.startsWith('STORY_')) return 'story';
  if (type.startsWith('BULLETIN_')) return 'bulletin';
  if (type.startsWith('SHOW_')) return 'show';
  return 'unknown';
} 