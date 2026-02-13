import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EpisodeStatus } from '@prisma/client';

// Types for show data
export interface Show {
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
  parentId?: string | null;
  parent?: {
    id: string;
    title: string;
    slug: string;
  };
  subShows?: Show[];
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
      color?: string;
      category: string;
    };
  }>;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  episodes?: Episode[];
  _count?: {
    episodes: number;
    subShows?: number;
  };
}

export interface Episode {
  id: string;
  showId: string;
  title: string;
  slug: string;
  description?: string;
  episodeNumber: number;
  content?: string;
  coverImage?: string;
  status: EpisodeStatus;
  duration: number | null;
  scheduledPublishAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  show?: Show;
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

export interface ShowFilters {
  query?: string;
  isPublished?: boolean;
  tagIds?: string[];
  parentId?: string | null;
  topLevelOnly?: boolean;
  page?: number;
  perPage?: number;
}

export interface CreateShowData {
  title: string;
  description?: string;
  tagIds?: string[];
  isPublished?: boolean;
  parentId?: string | null;
}

export interface UpdateShowData {
  title?: string;
  description?: string;
  tagIds?: string[];
  isPublished?: boolean;
  coverImage?: string | null;
  parentId?: string | null;
}

export interface CreateEpisodeData {
  title: string;
  description?: string;
  content?: string;
  coverImage?: string;
}

export interface UpdateEpisodeData {
  title?: string;
  slug?: string;
  description?: string;
  content?: string;
  coverImage?: string | null;
}

export interface PublishEpisodeData {
  scheduledPublishAt?: string;
}

// Fetch shows with filters
export function useShows(filters: ShowFilters = {}) {
  return useQuery({
    queryKey: ['shows', filters],
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

      const response = await fetch(`/api/newsroom/shows?${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch shows');
      }

      return response.json();
    },
  });
}

// Fetch a single show
export function useShow(id: string | null) {
  return useQuery({
    queryKey: ['shows', id],
    queryFn: async () => {
      if (!id) throw new Error('Show ID is required');

      const response = await fetch(`/api/newsroom/shows/${id}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch show');
      }

      const data = await response.json();
      return data.show as Show;
    },
    enabled: !!id,
  });
}

// Create a new show
export function useCreateShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateShowData) => {
      const response = await fetch('/api/newsroom/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create show');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
    },
  });
}

// Update a show
export function useUpdateShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateShowData }) => {
      const response = await fetch(`/api/newsroom/shows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update show');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      queryClient.invalidateQueries({ queryKey: ['shows', variables.id] });
    },
  });
}

// Delete a show
export function useDeleteShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/shows/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete show');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
    },
  });
}

// Upload show cover image
export function useUploadShowCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/newsroom/shows/${id}/cover`, {
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
      queryClient.invalidateQueries({ queryKey: ['shows', variables.id] });
    },
  });
}

// Fetch top-level shows for parent show dropdown
export function useParentShows() {
  return useQuery({
    queryKey: ['shows', 'parents'],
    queryFn: async () => {
      const response = await fetch('/api/newsroom/shows?topLevelOnly=true&perPage=100');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch parent shows');
      }

      const data = await response.json();
      return data.shows as Show[];
    },
  });
}

// Delete show cover image
export function useDeleteShowCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/shows/${id}/cover`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete cover image');
      }

      return response.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['shows', id] });
    },
  });
}
