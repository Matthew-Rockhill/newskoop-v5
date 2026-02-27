/**
 * Centralized formatting utilities for Newskoop
 *
 * Replaces inline formatDate functions and name concatenations
 * scattered across 40+ files.
 */

/**
 * Format a date as short: "Jan 5, 2026"
 * Used by: tags, classifications, audio-library, StoryList, StorySelector
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date as long: "January 5, 2026"
 * Used by: admin users detail, radio bulletins
 */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date with time: "Jan 5, 2026, 2:30 PM"
 * Used by: announcements, bulletins, comment-list, emails
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date with full detail: "Monday, January 5, 2026, 2:30 PM"
 * Used by: BulletinPreview
 */
export function formatDateTimeFull(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a user's full name with null safety.
 * Handles missing firstName/lastName gracefully.
 */
export function formatUserName(
  user: { firstName?: string | null; lastName?: string | null } | null | undefined,
): string {
  if (!user) return '';
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.join(' ') || '';
}

/**
 * Format an audit action code into a human-readable label.
 * e.g. "auth.login" → "Login", "user.create" → "User Created"
 */
export function formatAuditAction(action: string): string {
  const labels: Record<string, string> = {
    'auth.login': 'Login',
    'auth.login.failed': 'Failed Login',
    'auth.logout': 'Logout',
    'auth.password.reset.request': 'Password Reset Request',
    'auth.password.reset': 'Password Reset',
    'auth.password.change': 'Password Change',
    'user.create': 'User Created',
    'user.update': 'User Updated',
    'user.delete': 'User Deleted',
    'user.activate': 'User Activated',
    'user.deactivate': 'User Deactivated',
    'station.create': 'Station Created',
    'station.update': 'Station Updated',
    'station.delete': 'Station Deleted',
    'station.activate': 'Station Activated',
    'station.deactivate': 'Station Deactivated',
    'content.create': 'Content Created',
    'content.update': 'Content Updated',
    'content.delete': 'Content Deleted',
    'content.publish': 'Content Published',
    'content.unpublish': 'Content Unpublished',
  };
  return labels[action] || action;
}
