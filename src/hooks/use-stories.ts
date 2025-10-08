import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StoryStatus, StoryStage } from '@prisma/client';

// Types for story data
export interface Story {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: StoryStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    staffRole?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    staffRole?: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    staffRole?: string;
  };
  publisher?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    staffRole?: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    parent?: {
      id: string;
      name: string;
      slug: string;
    };
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
      color?: string;
    };
  }>;
  audioClips: Array<{
    id: string;
    filename: string;
    originalName: string;
    url: string;
    duration?: number;
    fileSize?: number;
    mimeType: string;
    description?: string;
    createdAt: string;
  }>;
  comments?: Array<{
    id: string;
    content: string;
    type: string;
    createdAt: string;
    author: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      staffRole?: string;
    };
    replies: Array<{
      id: string;
      content: string;
      createdAt: string;
      author: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        staffRole?: string;
      };
    }>;
  }>;
  _count?: {
    comments: number;
    audioClips: number;
    translations: number;
  };
  reviewChecklist?: {
    storyStructure?: boolean;
    languageGrammar?: boolean;
    factChecking?: boolean;
    audioQuality?: boolean;
  };
  storyGroup?: {
    id: string;
    name: string;
  };
  translations?: Array<{
    id: string;
    title: string;
    language: string;
    stage: string;
    isTranslation: boolean;
    authorRole?: string;
    author: {
      id: string;
      firstName: string;
      lastName: string;
    };
    _count: {
      audioClips: number;
    };
  }>;
  authorRole?: string;
  translationRequests?: Array<{
    id: string;
    status: string;
    targetLanguage: string;
    createdAt: string;
    updatedAt: string;
    approvedAt?: string;
    assignedTo?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    reviewer?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

export interface StoryFilters {
  query?: string;
  status?: StoryStatus;
  stage?: StoryStage;
  categoryId?: string;
  authorId?: string;
  assignedToId?: string;
  reviewerId?: string;
  assignedReviewerId?: string;
  assignedApproverId?: string;
  isTranslation?: boolean;
  tagIds?: string[];
  page?: number;
  perPage?: number;
}

export interface CreateStoryData {
  title: string;
  content: string;
  categoryId: string;
  tagIds?: string[];
}

export interface UpdateStoryData {
  title?: string;
  content?: string;
  categoryId?: string;
  tagIds?: string[];
}

export interface UpdateStoryStatusData {
  status: StoryStatus;
  assignedToId?: string;
  reviewerId?: string;
  categoryId?: string;
  language?: 'ENGLISH' | 'AFRIKAANS' | 'XHOSA';
  tagIds?: string[];
}

// Fetch stories with filters
export function useStories(filters: StoryFilters = {}) {
  return useQuery({
    queryKey: ['stories', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/newsroom/stories?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }
      return response.json();
    },
  });
}

// Fetch single story
export function useStory(id: string) {
  return useQuery({
    queryKey: ['story', id],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/stories/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch story');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Create story mutation
export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStoryData) => {
      const response = await fetch('/api/newsroom/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create story');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

// Update story mutation
export function useUpdateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStoryData }) => {
      const response = await fetch(`/api/newsroom/stories/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update story');
      }

      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['story', id] });
    },
  });
}

// Update story status mutation
export function useUpdateStoryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStoryStatusData }) => {
      const response = await fetch(`/api/newsroom/stories/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update story status');
      }

      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['story', id] });
    },
  });
}

// Delete story mutation
export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/stories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete story');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
} 