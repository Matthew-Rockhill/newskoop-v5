import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AudioClip {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  duration?: number | null;
  fileSize?: number | null;
  mimeType: string;
  title?: string | null;
  description?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  sourceStory?: {
    id: string;
    title: string;
  } | null;
  _count?: {
    stories: number;
  };
}

export interface AudioLibraryFilters {
  query?: string;
  tags?: string[];
  page?: number;
  perPage?: number;
}

// Fetch audio library clips with search/filter/pagination
export function useAudioLibrary(filters: AudioLibraryFilters = {}) {
  return useQuery({
    queryKey: ['audio-library', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.query) params.set('query', filters.query);
      if (filters.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));
      if (filters.page) params.set('page', String(filters.page));
      if (filters.perPage) params.set('perPage', String(filters.perPage));

      const response = await fetch(`/api/newsroom/audio-library?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audio library');
      return response.json();
    },
  });
}

// Fetch single audio clip details
export function useAudioClip(id: string) {
  return useQuery({
    queryKey: ['audio-clip', id],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/audio-library/${id}`);
      if (!response.ok) throw new Error('Failed to fetch audio clip');
      return response.json();
    },
    enabled: !!id,
  });
}

// Upload new audio clip to library
export function useUploadAudioClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/newsroom/audio-library', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload audio clip');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
    },
  });
}

// Update audio clip metadata
export function useUpdateAudioClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; description?: string; tags?: string[] } }) => {
      const response = await fetch(`/api/newsroom/audio-library/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update audio clip');
      }

      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
      queryClient.invalidateQueries({ queryKey: ['audio-clip', id] });
    },
  });
}

// Delete audio clip from library
export function useDeleteAudioClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/audio-library/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete audio clip');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

// Link existing library clips to a story
export function useLinkAudioToStory(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audioClipIds: string[]) => {
      const response = await fetch(`/api/newsroom/stories/${storyId}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioClipIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link audio clips');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
    },
  });
}

// Unlink audio clip from a story
export function useUnlinkAudioFromStory(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audioClipId: string) => {
      const response = await fetch(`/api/newsroom/stories/${storyId}/audio?clipId=${audioClipId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlink audio clip');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
    },
  });
}
