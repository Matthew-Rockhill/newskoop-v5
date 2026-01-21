import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized helper to invalidate all dashboard-related queries after mutations.
 * This ensures the UI reflects changes immediately without manual page refresh.
 */
export function invalidateDashboardQueries(queryClient: QueryClient, storyId?: string) {
  // Invalidate all story-related queries
  queryClient.invalidateQueries({ queryKey: ['stories'] });
  queryClient.invalidateQueries({ queryKey: ['translationTasks'] });

  // Invalidate specific story if ID provided
  if (storyId) {
    queryClient.invalidateQueries({ queryKey: ['story', storyId] });
  }
}

/**
 * Invalidate translation-related queries after translation mutations.
 */
export function invalidateTranslationQueries(queryClient: QueryClient, translationId?: string) {
  queryClient.invalidateQueries({ queryKey: ['translations'] });
  queryClient.invalidateQueries({ queryKey: ['translationTasks'] });
  queryClient.invalidateQueries({ queryKey: ['stories'] });

  if (translationId) {
    queryClient.invalidateQueries({ queryKey: ['translation', translationId] });
  }
}

/**
 * Invalidate bulletin-related queries after bulletin mutations.
 */
export function invalidateBulletinQueries(queryClient: QueryClient, bulletinId?: string) {
  queryClient.invalidateQueries({ queryKey: ['bulletins'] });

  if (bulletinId) {
    queryClient.invalidateQueries({ queryKey: ['bulletin', bulletinId] });
  }
}

/**
 * Invalidate comment-related queries after comment mutations.
 */
export function invalidateCommentQueries(queryClient: QueryClient, storyId: string) {
  queryClient.invalidateQueries({ queryKey: ['story', storyId] });
  queryClient.invalidateQueries({ queryKey: ['comments', storyId] });
}
