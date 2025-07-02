import { useQuery } from '@tanstack/react-query';

interface ActivityData {
  hour: number;
  time: string;
  staffUsers: number;
  radioUsers: number;
  total: number;
}

interface UserActivityResponse {
  activityData: ActivityData[];
  metadata: {
    dateRange: {
      start: string;
      end: string;
    };
    totalUsers: number;
    peakHour: ActivityData;
  };
}

async function fetchUserActivity(days: number = 7): Promise<UserActivityResponse> {
  const response = await fetch(`/api/analytics/user-activity?days=${days}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user activity data');
  }
  return response.json();
}

export function useUserActivity(days: number = 7) {
  return useQuery({
    queryKey: ['analytics', 'user-activity', days],
    queryFn: () => fetchUserActivity(days),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
} 