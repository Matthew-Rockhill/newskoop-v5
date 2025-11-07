'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data remains fresh for 5 minutes before refetch
        staleTime: 5 * 60 * 1000, // 5 minutes
        // Keep data in cache for 10 minutes after last use
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        // Don't refetch on window focus for better UX
        refetchOnWindowFocus: false,
        // Retry failed queries once
        retry: 1,
        // Only refetch on mount if data is stale
        refetchOnMount: true,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
} 