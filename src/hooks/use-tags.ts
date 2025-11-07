import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for tag data
export interface Tag {
  id: string;
  name: string;
  slug: string;
  nameAfrikaans?: string;
  descriptionAfrikaans?: string;
  color?: string;
  category: 'LANGUAGE' | 'RELIGION' | 'LOCALITY' | 'GENERAL';
  isRequired: boolean;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    stories: number;
  };
}

export interface CreateTagData {
  name: string;
  nameAfrikaans?: string;
  descriptionAfrikaans?: string;
  color?: string;
  category: 'LANGUAGE' | 'RELIGION' | 'LOCALITY' | 'GENERAL';
  isRequired?: boolean;
  isPreset?: boolean;
}

export interface UpdateTagData {
  name?: string;
  nameAfrikaans?: string;
  descriptionAfrikaans?: string;
  color?: string;
  category?: 'LANGUAGE' | 'RELIGION' | 'LOCALITY' | 'GENERAL';
  isRequired?: boolean;
  isPreset?: boolean;
}

export interface TagFilters {
  query?: string;
  category?: 'LANGUAGE' | 'RELIGION' | 'LOCALITY' | 'GENERAL';
  page?: number;
  perPage?: number;
}

// Fetch tags
export function useTags(query?: string, category?: 'LANGUAGE' | 'RELIGION' | 'LOCALITY' | 'GENERAL', page?: number, perPage?: number) {
  return useQuery({
    queryKey: ['tags', { query, category, page, perPage }],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (query) params.set('query', query);
      if (category) params.set('category', category);
      if (page) params.set('page', String(page));
      if (perPage) params.set('perPage', String(perPage));

      const response = await fetch(`/api/newsroom/tags?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      return response.json();
    },
  });
}

// Create tag mutation
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagData) => {
      const response = await fetch('/api/newsroom/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tag');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

// Update tag mutation
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTagData }) => {
      const response = await fetch(`/api/newsroom/tags/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tag');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

// Delete tag mutation
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/tags/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tag');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
} 