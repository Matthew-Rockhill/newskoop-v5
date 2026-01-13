import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClassificationType } from '@prisma/client';

export interface Classification {
  id: string;
  name: string;
  slug: string;
  nameAfrikaans: string | null;
  descriptionAfrikaans: string | null;
  type: ClassificationType;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    stories: number;
    allowedByStations: number;
  };
}

interface ClassificationsResponse {
  classifications: Classification[];
}

interface CreateClassificationData {
  name: string;
  nameAfrikaans?: string;
  descriptionAfrikaans?: string;
  type: ClassificationType;
  isActive?: boolean;
  sortOrder?: number;
}

interface UpdateClassificationData {
  name?: string;
  nameAfrikaans?: string;
  descriptionAfrikaans?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Fetch all classifications
export function useClassifications(type?: ClassificationType, isActive?: boolean) {
  return useQuery<ClassificationsResponse>({
    queryKey: ['classifications', type, isActive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (isActive !== undefined) params.set('isActive', String(isActive));

      const response = await fetch(`/api/newsroom/classifications?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch classifications');
      }
      return response.json();
    },
  });
}

// Fetch single classification
export function useClassification(id: string | null) {
  return useQuery<Classification>({
    queryKey: ['classification', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const response = await fetch(`/api/newsroom/classifications/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch classification');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Create classification
export function useCreateClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateClassificationData) => {
      const response = await fetch('/api/newsroom/classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create classification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classifications'] });
    },
  });
}

// Update classification
export function useUpdateClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClassificationData }) => {
      const response = await fetch(`/api/newsroom/classifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update classification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classifications'] });
    },
  });
}

// Delete classification
export function useDeleteClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/classifications/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete classification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classifications'] });
    },
  });
}
