import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Station, Province } from '@prisma/client';

interface StationsResponse {
  stations: Station[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

interface StationFilters {
  query?: string;
  province?: Province;
  isActive?: boolean;
  page?: number;
  perPage?: number;
}

// Station creation data interface matching form structure
export interface CreateStationData {
  name: string;
  province: Province;
  contactEmail?: string;
  contactNumber?: string;
  description?: string;
  website?: string;
  hasContentAccess?: boolean;
  allowedLanguages?: string[];
  allowedReligions?: string[];
  blockedCategories?: string[];
  primaryContact: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
  };
  additionalUsers?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
  }>;
}

async function fetchStations(filters: StationFilters = {}): Promise<StationsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });

  const response = await fetch(`/api/stations?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stations');
  }
  return response.json();
}

async function createStation(data: CreateStationData): Promise<Station> {
  const response = await fetch('/api/stations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create station');
  }

  return response.json();
}

async function updateStation(id: string, data: Partial<Station>): Promise<Station> {
  const response = await fetch(`/api/stations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update station');
  }

  return response.json();
}

async function deleteStation(id: string): Promise<void> {
  const response = await fetch(`/api/stations/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete station');
  }
}

export function useStations(initialFilters: StationFilters = {}) {
  const [filters, setFilters] = useState<StationFilters>(initialFilters);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['stations', filters],
    queryFn: () => fetchStations(filters),
  });

  const createMutation = useMutation({
    mutationFn: createStation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      toast.success('Station created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Station> }) =>
      updateStation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      toast.success('Station updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      toast.success('Station deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    stations: data?.stations || [],
    pagination: data?.pagination,
    isLoading,
    error,
    filters,
    setFilters,
    createStation: createMutation.mutate,
    updateStation: updateMutation.mutate,
    deleteStation: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
} 