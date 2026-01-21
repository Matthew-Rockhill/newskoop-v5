import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReviewerWorkload } from '@/lib/editorial-metrics';

export type ReassignmentType = 'reviewer' | 'approver' | 'translator';

interface ReassignmentUser extends ReviewerWorkload {
  translationLanguage?: string;
}

interface FetchUsersParams {
  type: ReassignmentType;
  targetLanguage?: string;
  enabled?: boolean;
}

interface ReassignMutationParams {
  storyId: string;
  assignedToId: string;
  type: ReassignmentType;
  note?: string;
}

/**
 * Fetch available users for reassignment based on type
 */
export function useReassignmentUsers({ type, targetLanguage, enabled = true }: FetchUsersParams) {
  return useQuery({
    queryKey: ['reassignmentUsers', type, targetLanguage],
    queryFn: async (): Promise<ReassignmentUser[]> => {
      // Fetch editorial metrics which includes workload info
      const metricsResponse = await fetch('/api/newsroom/dashboard/editorial-metrics');
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch editorial metrics');
      }
      const metrics = await metricsResponse.json();

      if (type === 'reviewer') {
        // Return journalists for reviewer assignments
        // API returns: reviewerWorkload.journalists
        return metrics.reviewerWorkload?.journalists || [];
      } else if (type === 'approver') {
        // Return sub-editors+ for approver assignments
        // API returns: reviewerWorkload.subEditors
        return metrics.reviewerWorkload?.subEditors || [];
      } else if (type === 'translator') {
        // Fetch users with matching translation language
        const usersResponse = await fetch(
          `/api/users?translationLanguage=${targetLanguage}&userType=STAFF&perPage=100`
        );
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch translators');
        }
        const usersData = await usersResponse.json();

        // Transform user data to match ReviewerWorkload interface
        return (usersData.users || []).map((user: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
          staffRole: string;
          translationLanguage?: string;
        }) => ({
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          storiesAssigned: 0, // Could be enhanced to show translation workload
          oldestAssignedDays: null,
          role: user.staffRole,
          translationLanguage: user.translationLanguage,
        }));
      }

      return [];
    },
    enabled: enabled && !!type,
  });
}

/**
 * Mutation hook for reassigning a story
 */
export function useReassignStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, assignedToId, type, note }: ReassignMutationParams) => {
      const response = await fetch(`/api/newsroom/stories/${storyId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          assignedToId,
          note,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reassign story');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all story-related queries
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['translationTasks'] });
      queryClient.invalidateQueries({ queryKey: ['reassignmentUsers'] });
      // Also invalidate editorial metrics
      queryClient.invalidateQueries({ queryKey: ['editorialMetrics'] });
    },
  });
}
