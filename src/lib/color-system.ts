/**
 * Centralized Color System for Newskoop
 *
 * This file defines the standard color mappings for consistent UI across the application.
 * All components should reference these constants instead of hardcoding colors.
 */

import type { BadgeProps } from '@/components/ui/badge';

type BadgeColor = BadgeProps['color'];

/**
 * Editorial Workflow Stage Colors
 * Used for story status badges throughout the newsroom
 */
export const STAGE_COLORS: Record<string, BadgeColor> = {
  // Initial states
  DRAFT: 'zinc',

  // Review stages
  NEEDS_JOURNALIST_REVIEW: 'amber',
  IN_REVIEW: 'amber', // Alias
  NEEDS_REVISION: 'red',
  NEEDS_SUB_EDITOR_APPROVAL: 'blue',
  PENDING_APPROVAL: 'blue', // Alias

  // Approved states
  APPROVED: 'emerald',

  // Translation stages
  PENDING_TRANSLATION: 'purple',
  TRANSLATED: 'teal',

  // Publication states
  READY_TO_PUBLISH: 'green',
  PUBLISHED: 'teal',

  // Archived
  ARCHIVED: 'zinc',
} as const;

/**
 * Translation Workflow Status Colors
 * Used for translation status badges
 */
export const TRANSLATION_STATUS_COLORS: Record<string, BadgeColor> = {
  PENDING: 'zinc',
  IN_PROGRESS: 'blue',
  NEEDS_REVIEW: 'amber',
  APPROVED: 'emerald',
  REJECTED: 'red',
  PUBLISHED: 'teal',
} as const;

/**
 * Language Badge Colors
 * Consistent colors for language indicators
 */
export const LANGUAGE_COLORS: Record<string, BadgeColor> = {
  ENGLISH: 'blue',
  AFRIKAANS: 'green',
  XHOSA: 'purple',
  // Default for unknown languages
  DEFAULT: 'zinc',
} as const;

/**
 * User Role Colors
 * For role badges and indicators
 */
export const ROLE_COLORS: Record<string, BadgeColor> = {
  SUPERADMIN: 'indigo',
  ADMIN: 'indigo',
  EDITOR: 'emerald',
  SUB_EDITOR: 'emerald',
  JOURNALIST: 'blue',
  INTERN: 'amber',
} as const;

/**
 * Feedback/Alert Colors
 * For notifications, toasts, and alert messages
 */
export const FEEDBACK_COLORS = {
  success: 'emerald',
  warning: 'amber',
  error: 'red',
  info: 'blue',
  neutral: 'zinc',
} as const;

/**
 * Tag Type Colors
 * For content tags based on their category
 */
export const TAG_TYPE_COLORS: Record<string, BadgeColor> = {
  LANGUAGE: 'blue',
  RELIGION: 'orange',
  LOCALITY: 'orange',
  GENERAL: 'green',
} as const;

/**
 * Classification Type Colors
 * For classification badges by type
 */
export const CLASSIFICATION_TYPE_COLORS: Record<string, BadgeColor> = {
  LANGUAGE: 'blue',
  RELIGION: 'purple',
  LOCALITY: 'amber',
} as const;

/**
 * Priority Colors
 * For announcement and content priority indicators
 */
export const PRIORITY_COLORS: Record<string, BadgeColor> = {
  LOW: 'blue',
  MEDIUM: 'amber',
  HIGH: 'red',
} as const;

/**
 * Target Audience Colors
 * For announcement targeting indicators
 */
export const AUDIENCE_COLORS: Record<string, BadgeColor> = {
  ALL: 'purple',
  NEWSROOM: 'blue',
  RADIO: 'green',
} as const;

/**
 * Category Level Colors
 * For category hierarchy level badges
 */
export const CATEGORY_LEVEL_COLORS: Record<number, BadgeColor> = {
  1: 'blue',    // Parent categories
  2: 'purple',  // Sub-categories
  3: 'zinc',    // Sub-sub-categories
} as const;

/**
 * Helper function to get stage color with fallback
 */
export function getStageColor(stage: string | null | undefined): BadgeColor {
  if (!stage) return 'zinc';
  return STAGE_COLORS[stage] || 'zinc';
}

/**
 * Helper function to get translation status color with fallback
 */
export function getTranslationStatusColor(status: string | null | undefined): BadgeColor {
  if (!status) return 'zinc';
  return TRANSLATION_STATUS_COLORS[status] || 'zinc';
}

/**
 * Helper function to get language color with fallback
 */
export function getLanguageColor(language: string | null | undefined): BadgeColor {
  if (!language) return 'zinc';
  const upperLang = language.toUpperCase();
  return LANGUAGE_COLORS[upperLang] || LANGUAGE_COLORS.DEFAULT;
}

/**
 * Helper function to get role color with fallback
 */
export function getRoleColor(role: string | null | undefined): BadgeColor {
  if (!role) return 'zinc';
  return ROLE_COLORS[role] || 'zinc';
}

/**
 * Helper function to get priority color with fallback
 */
export function getPriorityColor(priority: string | null | undefined): BadgeColor {
  if (!priority) return 'blue';
  return PRIORITY_COLORS[priority] || 'blue';
}

/**
 * Helper function to get audience color with fallback
 */
export function getAudienceColor(audience: string | null | undefined): BadgeColor {
  if (!audience) return 'zinc';
  return AUDIENCE_COLORS[audience] || 'zinc';
}

/**
 * Helper function to get tag type color with fallback
 */
export function getTagTypeColor(tagType: string | null | undefined): BadgeColor {
  if (!tagType) return 'zinc';
  return TAG_TYPE_COLORS[tagType] || 'zinc';
}

/**
 * Helper function to get category level color with fallback
 */
export function getCategoryLevelColor(level: number | null | undefined): BadgeColor {
  if (!level) return 'zinc';
  return CATEGORY_LEVEL_COLORS[level] || 'zinc';
}

/**
 * Helper function to get classification type color with fallback
 */
export function getClassificationTypeColor(type: string | null | undefined): BadgeColor {
  if (!type) return 'zinc';
  return CLASSIFICATION_TYPE_COLORS[type] || 'zinc';
}
