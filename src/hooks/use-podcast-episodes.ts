import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PodcastEpisode, CreatePodcastEpisodeData, UpdatePodcastEpisodeData, PublishPodcastEpisodeData } from './use-podcasts';

// Fetch episodes for a podcast
export function usePodcastEpisodes(podcastId: string | null) {
  return useQuery({
    queryKey: ['podcast-episodes', podcastId],
    queryFn: async () => {
      if (!podcastId) throw new Error('Podcast ID is required');

      const response = await fetch(`/api/newsroom/podcasts/${podcastId}/episodes`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch episodes');
      }

      const data = await response.json();
      return data.episodes as PodcastEpisode[];
    },
    enabled: !!podcastId,
  });
}

// Fetch a single episode
export function usePodcastEpisode(podcastId: string | null, episodeId: string | null) {
  return useQuery({
    queryKey: ['podcast-episodes', podcastId, episodeId],
    queryFn: async () => {
      if (!podcastId || !episodeId) throw new Error('Podcast ID and Episode ID are required');

      const response = await fetch(`/api/newsroom/podcasts/${podcastId}/episodes/${episodeId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch episode');
      }

      const data = await response.json();
      return data.episode as PodcastEpisode;
    },
    enabled: !!podcastId && !!episodeId,
  });
}

// Create a new episode
export function useCreatePodcastEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ podcastId, data }: { podcastId: string; data: CreatePodcastEpisodeData }) => {
      const response = await fetch(`/api/newsroom/podcasts/${podcastId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create episode');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId] });
      queryClient.invalidateQueries({ queryKey: ['podcasts', variables.podcastId] });
    },
  });
}

// Update an episode
export function useUpdatePodcastEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      podcastId,
      episodeId,
      data
    }: {
      podcastId: string;
      episodeId: string;
      data: UpdatePodcastEpisodeData
    }) => {
      const response = await fetch(`/api/newsroom/podcasts/${podcastId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update episode');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId] });
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId, variables.episodeId] });
    },
  });
}

// Delete an episode
export function useDeletePodcastEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ podcastId, episodeId }: { podcastId: string; episodeId: string }) => {
      const response = await fetch(`/api/newsroom/podcasts/${podcastId}/episodes/${episodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete episode');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId] });
      queryClient.invalidateQueries({ queryKey: ['podcasts', variables.podcastId] });
    },
  });
}

// Upload episode audio via direct-to-R2 presigned URLs
export function useUploadPodcastEpisodeAudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      podcastId,
      episodeId,
      files
    }: {
      podcastId: string;
      episodeId: string;
      files: File[]
    }) => {
      // Step 1: Upload each file directly to R2 via presigned URLs
      const uploads = await Promise.all(
        files.map(async (file) => {
          // Get presigned URL from server
          const presignRes = await fetch('/api/newsroom/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              fileSize: file.size,
              folder: 'newsroom/podcasts/audio',
            }),
          });

          if (!presignRes.ok) {
            const err = await presignRes.json().catch(() => ({ error: 'Failed to prepare upload' }));
            throw new Error(err.error || 'Failed to prepare upload');
          }

          const { presignedUrl, key, publicUrl } = await presignRes.json();

          // Upload file directly to R2
          const uploadRes = await fetch(presignedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error(`Failed to upload ${file.name} to storage`);
          }

          return {
            key,
            publicUrl,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          };
        })
      );

      // Step 2: Confirm uploads with the server to create DB records
      const response = await fetch(`/api/newsroom/podcasts/${podcastId}/episodes/${episodeId}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploads }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save audio files' }));
        throw new Error(error.error || 'Failed to save audio files');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.episode) {
        queryClient.setQueryData(['podcast-episodes', variables.podcastId, variables.episodeId], data.episode);
      }
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId, variables.episodeId] });
    },
  });
}

// Link existing library clips to a podcast episode
export function useLinkAudioToPodcastEpisode(podcastId: string, episodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audioClipIds: string[]) => {
      const response = await fetch(`/api/newsroom/podcasts/${podcastId}/episodes/${episodeId}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioClipIds }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to link audio clips' }));
        throw new Error(error.error || 'Failed to link audio clips');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.episode) {
        queryClient.setQueryData(['podcast-episodes', podcastId, episodeId], data.episode);
      }
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', podcastId, episodeId] });
    },
  });
}

// Delete podcast episode audio
export function useDeletePodcastEpisodeAudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      podcastId,
      episodeId,
      audioClipId
    }: {
      podcastId: string;
      episodeId: string;
      audioClipId: string
    }) => {
      const response = await fetch(
        `/api/newsroom/podcasts/${podcastId}/episodes/${episodeId}/audio?audioClipId=${audioClipId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete audio file' }));
        throw new Error(error.error || 'Failed to delete audio file');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.episode) {
        queryClient.setQueryData(['podcast-episodes', variables.podcastId, variables.episodeId], data.episode);
      }
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId, variables.episodeId] });
    },
  });
}

// Publish or schedule a podcast episode
export function usePublishPodcastEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      podcastId,
      episodeId,
      data
    }: {
      podcastId: string;
      episodeId: string;
      data?: PublishPodcastEpisodeData
    }) => {
      const response = await fetch(`/api/newsroom/podcasts/${podcastId}/episodes/${episodeId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish episode');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId] });
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId, variables.episodeId] });
    },
  });
}

// Unpublish a podcast episode
export function useUnpublishPodcastEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ podcastId, episodeId }: { podcastId: string; episodeId: string }) => {
      const response = await fetch(`/api/newsroom/podcasts/${podcastId}/episodes/${episodeId}/publish`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unpublish episode');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId] });
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes', variables.podcastId, variables.episodeId] });
    },
  });
}
