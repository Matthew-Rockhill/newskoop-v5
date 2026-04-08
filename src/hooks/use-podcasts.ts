import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PodcastEpisodeStatus } from '@prisma/client';

// Types for podcast data
export interface Podcast {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
  };
  classifications: Array<{
    classification: {
      id: string;
      name: string;
      slug: string;
      type: string;
    };
  }>;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  episodes?: PodcastEpisode[];
  _count?: {
    episodes: number;
  };
}

export interface PodcastEpisode {
  id: string;
  podcastId: string;
  title: string;
  slug: string;
  description?: string;
  episodeNumber: number;
  content?: string;
  coverImage?: string;
  status: PodcastEpisodeStatus;
  duration: number | null;
  scheduledPublishAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  podcast?: Podcast;
  audioClips: Array<{
    id: string;
    filename: string;
    originalName: string;
    url: string;
    duration: number | null;
    fileSize?: number;
    mimeType: string;
    createdAt: string;
  }>;
  publisher?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface PodcastFilters {
  query?: string;
  isPublished?: boolean;
  classificationIds?: string[];
  page?: number;
  perPage?: number;
}

export interface CreatePodcastData {
  title: string;
  description?: string;
  classificationIds?: string[];
  isPublished?: boolean;
}

export interface UpdatePodcastData {
  title?: string;
  description?: string;
  classificationIds?: string[];
  isPublished?: boolean;
  coverImage?: string | null;
}

export interface CreatePodcastEpisodeData {
  title: string;
  description?: string;
  content?: string;
  coverImage?: string;
}

export interface UpdatePodcastEpisodeData {
  title?: string;
  slug?: string;
  description?: string;
  content?: string;
  coverImage?: string | null;
}

export interface PublishPodcastEpisodeData {
  scheduledPublishAt?: string;
}

// Fetch podcasts with filters
export function usePodcasts(filters: PodcastFilters = {}) {
  return useQuery({
    queryKey: ['podcasts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/newsroom/podcasts?${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch podcasts');
      }

      return response.json();
    },
  });
}

// Fetch a single podcast
export function usePodcast(id: string | null) {
  return useQuery({
    queryKey: ['podcasts', id],
    queryFn: async () => {
      if (!id) throw new Error('Podcast ID is required');

      const response = await fetch(`/api/newsroom/podcasts/${id}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch podcast');
      }

      const data = await response.json();
      return data.podcast as Podcast;
    },
    enabled: !!id,
  });
}

// Create a new podcast
export function useCreatePodcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePodcastData) => {
      const response = await fetch('/api/newsroom/podcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create podcast');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] });
    },
  });
}

// Update a podcast
export function useUpdatePodcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePodcastData }) => {
      const response = await fetch(`/api/newsroom/podcasts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update podcast');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] });
      queryClient.invalidateQueries({ queryKey: ['podcasts', variables.id] });
    },
  });
}

// Delete a podcast
export function useDeletePodcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/podcasts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete podcast');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] });
    },
  });
}

// Upload podcast cover image
export function useUploadPodcastCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/newsroom/podcasts/${id}/cover`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload cover image');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', variables.id] });
    },
  });
}

// Delete podcast cover image
export function useDeletePodcastCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/podcasts/${id}/cover`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete cover image');
      }

      return response.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['podcasts', id] });
    },
  });
}
