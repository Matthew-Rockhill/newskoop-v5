import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Episode, CreateEpisodeData, UpdateEpisodeData, PublishEpisodeData } from './use-shows';

// Fetch episodes for a show
export function useEpisodes(showId: string | null) {
  return useQuery({
    queryKey: ['episodes', showId],
    queryFn: async () => {
      if (!showId) throw new Error('Show ID is required');

      const response = await fetch(`/api/newsroom/shows/${showId}/episodes`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch episodes');
      }

      const data = await response.json();
      return data.episodes as Episode[];
    },
    enabled: !!showId,
  });
}

// Fetch a single episode
export function useEpisode(showId: string | null, episodeId: string | null) {
  return useQuery({
    queryKey: ['episodes', showId, episodeId],
    queryFn: async () => {
      if (!showId || !episodeId) throw new Error('Show ID and Episode ID are required');

      const response = await fetch(`/api/newsroom/shows/${showId}/episodes/${episodeId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch episode');
      }

      const data = await response.json();
      return data.episode as Episode;
    },
    enabled: !!showId && !!episodeId,
  });
}

// Create a new episode
export function useCreateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ showId, data }: { showId: string; data: CreateEpisodeData }) => {
      const response = await fetch(`/api/newsroom/shows/${showId}/episodes`, {
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
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId] });
      queryClient.invalidateQueries({ queryKey: ['shows', variables.showId] });
    },
  });
}

// Update an episode
export function useUpdateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      showId,
      episodeId,
      data
    }: {
      showId: string;
      episodeId: string;
      data: UpdateEpisodeData
    }) => {
      const response = await fetch(`/api/newsroom/shows/${showId}/episodes/${episodeId}`, {
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
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId] });
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId, variables.episodeId] });
    },
  });
}

// Delete an episode
export function useDeleteEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ showId, episodeId }: { showId: string; episodeId: string }) => {
      const response = await fetch(`/api/newsroom/shows/${showId}/episodes/${episodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete episode');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId] });
      queryClient.invalidateQueries({ queryKey: ['shows', variables.showId] });
    },
  });
}

// Upload episode audio via direct-to-R2 presigned URLs
export function useUploadEpisodeAudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      showId,
      episodeId,
      files
    }: {
      showId: string;
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
              folder: 'newsroom/shows/audio',
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
      const response = await fetch(`/api/newsroom/shows/${showId}/episodes/${episodeId}/audio`, {
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
      // If API returns full episode, update cache directly for immediate UI update
      if (data.episode) {
        queryClient.setQueryData(['episodes', variables.showId, variables.episodeId], data.episode);
      }
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId, variables.episodeId] });
    },
  });
}

// Link existing library clips to an episode
export function useLinkAudioToEpisode(showId: string, episodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audioClipIds: string[]) => {
      const response = await fetch(`/api/newsroom/shows/${showId}/episodes/${episodeId}/audio`, {
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
        queryClient.setQueryData(['episodes', showId, episodeId], data.episode);
      }
      queryClient.invalidateQueries({ queryKey: ['episodes', showId, episodeId] });
    },
  });
}

// Delete episode audio
export function useDeleteEpisodeAudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      showId,
      episodeId,
      audioClipId
    }: {
      showId: string;
      episodeId: string;
      audioClipId: string
    }) => {
      const response = await fetch(
        `/api/newsroom/shows/${showId}/episodes/${episodeId}/audio?audioClipId=${audioClipId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete audio file' }));
        throw new Error(error.error || 'Failed to delete audio file');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // If API returns full episode, update cache directly for immediate UI update
      if (data.episode) {
        queryClient.setQueryData(['episodes', variables.showId, variables.episodeId], data.episode);
      }
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId, variables.episodeId] });
    },
  });
}

// Publish or schedule an episode
export function usePublishEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      showId,
      episodeId,
      data
    }: {
      showId: string;
      episodeId: string;
      data?: PublishEpisodeData
    }) => {
      const response = await fetch(`/api/newsroom/shows/${showId}/episodes/${episodeId}/publish`, {
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
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId] });
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId, variables.episodeId] });
    },
  });
}

// Unpublish an episode
export function useUnpublishEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ showId, episodeId }: { showId: string; episodeId: string }) => {
      const response = await fetch(`/api/newsroom/shows/${showId}/episodes/${episodeId}/publish`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unpublish episode');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId] });
      queryClient.invalidateQueries({ queryKey: ['episodes', variables.showId, variables.episodeId] });
    },
  });
}
