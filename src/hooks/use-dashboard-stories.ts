import { useQuery } from '@tanstack/react-query';

export interface DashboardStory {
  id: string;
  title: string;
  updatedAt: string;
  language: string;
  author: { firstName: string; lastName: string };
  assignedReviewer: { firstName: string; lastName: string } | null;
  assignedApprover: { firstName: string; lastName: string } | null;
  _count: { audioClips: number };
}

export interface DashboardStoriesResponse {
  myWork: {
    drafts: DashboardStory[];
    needsReview: DashboardStory[];
    needsApproval: DashboardStory[];
    approved: DashboardStory[];
    published: DashboardStory[];
  };
  tasks: {
    review: DashboardStory[];
    approval: DashboardStory[];
    translation: DashboardStory[];
    publishing: DashboardStory[];
  };
}

export function useDashboardStories(userId: string | undefined) {
  return useQuery<DashboardStoriesResponse>({
    queryKey: ['dashboardStories'],
    queryFn: async () => {
      const response = await fetch('/api/newsroom/dashboard/my-stories');
      if (!response.ok) throw new Error('Failed to fetch dashboard stories');
      return response.json();
    },
    enabled: !!userId,
  });
}
