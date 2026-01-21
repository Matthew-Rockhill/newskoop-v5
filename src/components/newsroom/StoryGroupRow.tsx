import { useState, useEffect, KeyboardEvent, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/ui/dialog';
import { StageBadge } from '@/components/ui/stage-badge';
import clsx from 'clsx';
import type { StoryStage } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { canPublishStory } from '@/lib/permissions';

// Helper for keyboard navigation on clickable elements
function handleKeyboardNavigation(callback: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
}

interface Translation {
  id: string;
  title: string;
  language: string;
  stage: string;
  isTranslation: boolean;
  authorRole?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    audioClips: number;
  };
}

interface StoryGroupRowProps {
  story: {
    id: string;
    title: string;
    stage: StoryStage | null;
    language: string;
    updatedAt: string | Date;
    authorRole?: string;
    author: {
      firstName: string;
      lastName: string;
    };
    category?: {
      name: string;
    } | null;
    _count?: {
      comments: number;
      audioClips: number;
      translations: number;
    };
    translations?: Translation[];
  };
  index?: number;
}

// Map language codes to display names
const languageMap: Record<string, string> = {
  ENGLISH: 'English',
  AFRIKAANS: 'Afrikaans',
  XHOSA: 'Xhosa',
  ZULU: 'Zulu',
  SOTHO: 'Sotho',
  TSWANA: 'Tswana',
  PEDI: 'Pedi',
  TSONGA: 'Tsonga',
  SWATI: 'Swati',
  VENDA: 'Venda',
  NDEBELE: 'Ndebele',
};

export function StoryGroupRow({ story, index = 0 }: StoryGroupRowProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const translations = story.translations || [];
  const hasTranslations = translations.length > 0;

  // Ensure portal only renders on client side to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if entire group is ready to publish together
  const isGroupReadyToPublish =
    story.stage === 'TRANSLATED' &&
    hasTranslations &&
    translations.every(t => t.stage === 'TRANSLATED');

  // Check user permissions
  const userRole = session?.user?.staffRole ?? null;
  const userCanPublish = canPublishStory(userRole);

  // Always show actual date and time instead of relative times
  const formatRelativeTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle group publish
  const handlePublishGroup = async () => {
    if (!isGroupReadyToPublish || !userCanPublish) return;

    setIsPublishing(true);
    try {
      const response = await fetch(`/api/newsroom/stories/${story.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishImmediately: true,
          contentReviewed: true,
          translationsVerified: true,
          audioQualityChecked: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish group');
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Error publishing group:', error);
      alert(error instanceof Error ? error.message : 'Failed to publish group');
    } finally {
      setIsPublishing(false);
      setShowPublishModal(false);
    }
  };

  return (
    <Fragment>
      {/* Main Story Row */}
      <tr
        tabIndex={0}
        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
        className={clsx(
          'group transition-colors cursor-pointer',
          'hover:bg-zinc-100 dark:hover:bg-zinc-800',
          'focus-within:bg-zinc-100 dark:focus-within:bg-zinc-800'
        )}
      >
        {/* Expand/Title Column */}
        <td className="px-4 py-4 text-sm text-zinc-900 dark:text-zinc-100">
          <div className="flex items-center gap-2">
            {hasTranslations ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse translations' : 'Expand translations'}
                className="flex-shrink-0 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
              >
                <ChevronRightIcon
                  className={clsx(
                    'h-5 w-5 text-zinc-500 transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <div className="w-7" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {story.title}
              </div>
              {hasTranslations && (
                <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                  <GlobeAltIcon className="h-3.5 w-3.5" />
                  {translations.length} translation{translations.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Author Column */}
        <td className="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400 hidden sm:table-cell">
          {story.author.firstName} {story.author.lastName}
        </td>

        {/* Category Column */}
        <td className="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400 hidden lg:table-cell">
          {story.category?.name || 'Uncategorized'}
        </td>

        {/* Stage Column */}
        <td className="px-4 py-4 text-sm">
          {story.stage && <StageBadge stage={story.stage as StoryStage} />}
        </td>

        {/* Updated Column */}
        <td className="px-4 py-4 text-sm text-zinc-500 hidden sm:table-cell">
          {formatRelativeTime(story.updatedAt)}
        </td>

        {/* Actions Column */}
        <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => router.push(`/newsroom/stories/${story.id}`)}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 transition-colors"
              aria-label={`View story: ${story.title}`}
            >
              <EyeIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {isGroupReadyToPublish && userCanPublish && (
              <button
                type="button"
                onClick={() => setShowPublishModal(true)}
                className="rounded-md p-1.5 text-kelly-green hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 transition-colors"
                disabled={isPublishing}
                aria-label={`Publish story group: ${story.title}`}
              >
                <RocketLaunchIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Translation Rows (shown when expanded) */}
      {isExpanded &&
        translations.map((translation) => (
          <tr
            key={translation.id}
            tabIndex={0}
            onClick={() => router.push(`/newsroom/stories/${translation.id}`)}
            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${translation.id}`))}
            className={clsx(
              'group transition-colors cursor-pointer',
              'bg-purple-50/50 dark:bg-purple-900/10',
              'hover:bg-purple-100 dark:hover:bg-purple-900/20',
              'focus-within:bg-purple-100 dark:focus-within:bg-purple-900/20'
            )}
          >
            {/* Title Column - indented */}
            <td className="px-4 py-4 text-sm text-zinc-900 dark:text-zinc-100">
              <div className="flex items-center gap-2 pl-8">
                <GlobeAltIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    {translation.title}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    {languageMap[translation.language] || translation.language}
                  </div>
                </div>
              </div>
            </td>

            {/* Author Column */}
            <td className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
              {translation.author.firstName} {translation.author.lastName}
            </td>

            {/* Category Column - shows Translation badge */}
            <td className="px-4 py-4 text-sm hidden lg:table-cell">
              <Badge color="purple" className="text-xs">Translation</Badge>
            </td>

            {/* Stage Column */}
            <td className="px-4 py-4 text-sm">
              {translation.stage && <StageBadge stage={translation.stage as StoryStage} />}
            </td>

            {/* Updated Column - empty for translations */}
            <td className="px-4 py-4 text-sm hidden sm:table-cell" />

            {/* Actions Column */}
            <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => router.push(`/newsroom/stories/${translation.id}`)}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 transition-colors"
                  aria-label={`View translation: ${translation.title}`}
                >
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        ))}

      {/* Publish Group Confirmation Modal - rendered via portal */}
      {isMounted && createPortal(
        <Dialog open={showPublishModal} onClose={() => setShowPublishModal(false)}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <RocketLaunchIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Publish Story Group</DialogTitle>
              <DialogDescription>
                You are about to publish the following stories together:
              </DialogDescription>
            </div>
          </div>
          <DialogBody>
            <ul className="space-y-3 mb-4">
              <li className="flex items-start gap-2">
                <Badge color="blue" className="text-xs mt-0.5 flex-shrink-0 whitespace-nowrap">Original</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 break-words">
                    {story.title}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {languageMap[story.language] || story.language}
                  </div>
                </div>
              </li>
              {translations.map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <Badge color="purple" className="text-xs mt-0.5 flex-shrink-0 whitespace-nowrap">Translation</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 break-words">
                      {t.title}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {languageMap[t.language] || t.language}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              All {1 + translations.length} stories will be published immediately and made available to radio stations.
            </p>
          </DialogBody>
          <DialogActions>
            <Button
              onClick={() => setShowPublishModal(false)}
              color="white"
              disabled={isPublishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublishGroup}
              color="primary"
              disabled={isPublishing}
            >
              {isPublishing ? 'Publishing...' : 'Publish Group'}
            </Button>
          </DialogActions>
        </Dialog>,
        document.body
      )}
    </Fragment>
  );
}
