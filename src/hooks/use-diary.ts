import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface DiaryEntry {
  id: string;
  title: string;
  dateTime: string;
  notes: string | null;
  storyId: string | null;
  story: { id: string; title: string; status?: string } | null;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string; staffRole?: string };
  assignedToId: string | null;
  assignedTo: { id: string; firstName: string; lastName: string; staffRole?: string } | null;
  isCompleted: boolean;
  completedAt: string | null;
  completedById: string | null;
  createdAt: string;
  updatedAt: string;
  daysUntil?: number;
  isOverdue?: boolean;
  isDueToday?: boolean;
  isDueSoon?: boolean;
}

interface DiaryUpcomingResponse {
  entries: DiaryEntry[];
  grouped: {
    overdue: DiaryEntry[];
    dueToday: DiaryEntry[];
    dueSoon: DiaryEntry[];
    upcoming: DiaryEntry[];
  };
  total: number;
  counts: {
    overdue: number;
    dueToday: number;
    dueSoon: number;
    upcoming: number;
  };
}

interface DiaryListResponse extends DiaryUpcomingResponse {
  pagination: {
    page: number;
    perPage: number;
    totalPages: number;
  };
}

interface DiaryListParams {
  page?: number;
  perPage?: number;
  from?: string;
  to?: string;
  includeCompleted?: boolean;
  assigneeId?: string;
}

export interface CreateDiaryEntryData {
  title: string;
  dateTime: string;
  notes?: string;
  storyId?: string;
  assignedToId?: string;
}

export interface UpdateDiaryEntryData {
  title?: string;
  dateTime?: string;
  notes?: string | null;
  storyId?: string | null;
  assignedToId?: string | null;
}

// Fetch upcoming diary entries (for dashboard widget)
export function useDiaryUpcoming() {
  return useQuery<DiaryUpcomingResponse>({
    queryKey: ['diary-upcoming'],
    queryFn: async () => {
      const response = await fetch('/api/newsroom/diary/upcoming');
      if (!response.ok) {
        throw new Error('Failed to fetch upcoming diary entries');
      }
      return response.json();
    },
  });
}

// Fetch paginated diary entries with filters (for full page)
export function useDiaryEntries(params: DiaryListParams = {}) {
  return useQuery<DiaryListResponse>({
    queryKey: ['diary', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.perPage) searchParams.set('perPage', String(params.perPage));
      if (params.from) searchParams.set('from', params.from);
      if (params.to) searchParams.set('to', params.to);
      if (params.includeCompleted) searchParams.set('includeCompleted', 'true');
      if (params.assigneeId) searchParams.set('assigneeId', params.assigneeId);

      const response = await fetch(`/api/newsroom/diary?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch diary entries');
      }
      return response.json();
    },
  });
}

// Create diary entry
export function useCreateDiaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDiaryEntryData) => {
      const response = await fetch('/api/newsroom/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create diary entry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      queryClient.invalidateQueries({ queryKey: ['diary-upcoming'] });
    },
  });
}

// Update diary entry
export function useUpdateDiaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDiaryEntryData }) => {
      const response = await fetch(`/api/newsroom/diary/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update diary entry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      queryClient.invalidateQueries({ queryKey: ['diary-upcoming'] });
    },
  });
}

// Toggle diary entry completion
export function useCompleteDiaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/diary/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update diary entry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      queryClient.invalidateQueries({ queryKey: ['diary-upcoming'] });
    },
  });
}

// Delete diary entry
export function useDeleteDiaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/diary/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete diary entry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      queryClient.invalidateQueries({ queryKey: ['diary-upcoming'] });
    },
  });
}
