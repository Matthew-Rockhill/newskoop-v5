import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  TagIcon,
  MusicalNoteIcon,
  EyeIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StageBadge } from '@/components/ui/stage-badge';
import { MiniStageProgress } from '@/components/ui/mini-stage-progress';
import clsx from 'clsx';
import type { StoryStage, StaffRole } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { canPublishStory } from '@/lib/permissions';

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
}

// Map language codes to display names
const languageMap: Record<string, string> = {
  ENGLISH: 'EN',
  AFRIKAANS: 'AF',
  XHOSA: 'XH',
  ZULU: 'ZU',
  SOTHO: 'ST',
  TSWANA: 'TN',
  PEDI: 'NSO',
  TSONGA: 'TS',
  SWATI: 'SS',
  VENDA: 'VE',
  NDEBELE: 'NR',
};

// Get stage color for translation badges
const getStageColor = (stage: string): 'green' | 'purple' | 'zinc' | 'amber' | 'blue' => {
  if (stage === 'PUBLISHED') return 'green';
  if (stage === 'TRANSLATED' || stage === 'APPROVED') return 'purple';
  if (stage === 'NEEDS_SUB_EDITOR_APPROVAL') return 'blue';
  if (stage === 'NEEDS_JOURNALIST_REVIEW') return 'amber';
  return 'zinc';
};

// Get stage icon
const getStageIcon = (stage: string): string => {
  if (stage === 'PUBLISHED') return '✓';
  if (stage === 'TRANSLATED' || stage === 'APPROVED') return '⏳';
  if (stage === 'NEEDS_SUB_EDITOR_APPROVAL' || stage === 'NEEDS_JOURNALIST_REVIEW') return '👁️';
  return '○';
};

// Get border color based on story group status
const getGroupBorderColor = (
  originalStage: string | null,
  translations: Translation[]
): string => {
  if (!translations || translations.length === 0) {
    return 'border-l-gray-300'; // No translations
  }

  const allPublished = translations.every(t => t.stage === 'PUBLISHED');
  const allReady = translations.every(t =>
    t.stage === 'PUBLISHED' || t.stage === 'TRANSLATED' || t.stage === 'APPROVED'
  );
  const someReady = translations.some(t =>
    t.stage === 'PUBLISHED' || t.stage === 'TRANSLATED' || t.stage === 'APPROVED'
  );

  // Purple: All published
  if (allPublished && originalStage === 'PUBLISHED') {
    return 'border-l-purple-500';
  }

  // Green: All ready for publishing
  if (allReady && (originalStage === 'APPROVED' || originalStage === 'TRANSLATED')) {
    return 'border-l-green-500';
  }

  // Yellow: Partially ready
  if (someReady) {
    return 'border-l-amber-400';
  }

  // Grey: Basic/in progress
  return 'border-l-gray-300';
};

export function StoryGroupRow({ story }: StoryGroupRowProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const translations = story.translations || [];
  const hasTranslations = translations.length > 0;

  // Calculate translation completion status
  const completedTranslations = translations.filter(
    t => t.stage === 'PUBLISHED' || t.stage === 'TRANSLATED' || t.stage === 'APPROVED'
  ).length;
  const totalTranslations = translations.length;

  // Check if entire group is ready to publish together
  const isGroupReadyToPublish =
    story.stage === 'TRANSLATED' &&
    hasTranslations &&
    translations.every(t => t.stage === 'TRANSLATED');

  // Check user permissions
  const userRole = session?.user?.staffRole ?? null;
  const userCanPublish = canPublishStory(userRole);

  const formatRelativeTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get dynamic border color based on story group status
  const borderColor = getGroupBorderColor(story.stage, translations);

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
    <>
      {/* Main Story Row */}
      <tr
        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
        className={clsx(
          'cursor-pointer focus:outline-none',
          'bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/10',
          'border-b border-gray-200 dark:border-gray-700',
          'transition-all duration-150',
          hasTranslations && `border-l-4 ${borderColor} shadow-sm`
        )}
      >
        <td className="py-4 px-4">
          <div className="flex items-center gap-4">
            {/* Expand/collapse button for stories with translations */}
            {hasTranslations && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                )}
              </button>
            )}

            <Avatar
              className={clsx('h-12 w-12 flex-shrink-0', !hasTranslations && 'ml-9')}
              name={`${story.author.firstName} ${story.author.lastName}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base">
                  {story.title}
                </div>
                <Badge color="blue" className="text-xs font-medium">
                  Original
                </Badge>
                <Badge color="zinc" className="text-xs">
                  {languageMap[story.language] || story.language}
                </Badge>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">
                by {story.author.firstName} {story.author.lastName}
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <TagIcon className="h-3 w-3" />
                  {story.category ? (
                    story.category.name
                  ) : (
                    <span className="italic text-zinc-400">No category</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <ChatBubbleLeftRightIcon className="h-3 w-3" />
                  {story._count?.comments || 0} comments
                </div>
                {story._count?.audioClips && story._count.audioClips > 0 && (
                  <div className="flex items-center gap-1 text-kelly-green">
                    <MusicalNoteIcon className="h-3 w-3" />
                    {story._count.audioClips}{' '}
                    {story._count.audioClips === 1 ? 'clip' : 'clips'}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {formatRelativeTime(story.updatedAt)}
                </div>
                {/* Progress indicator */}
                {story.stage && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">Progress:</span>
                    <MiniStageProgress
                      currentStage={story.stage}
                      authorRole={story.authorRole as StaffRole}
                    />
                  </div>
                )}
                {/* Translation summary */}
                {hasTranslations && (
                  <div className="flex items-center gap-1.5">
                    <GlobeAltIcon className="h-3 w-3" />
                    <span>
                      {completedTranslations}/{totalTranslations} complete
                    </span>
                    {translations.map((t) => (
                      <Badge
                        key={t.id}
                        color={getStageColor(t.stage)}
                        className="text-xs px-1.5 py-0.5"
                      >
                        {languageMap[t.language] || t.language.substring(0, 2)}{' '}
                        {getStageIcon(t.stage)}
                      </Badge>
                    ))}
                    {/* Ready to publish indicator */}
                    {isGroupReadyToPublish && (
                      <Badge color="green" className="text-xs px-1.5 py-0.5 font-semibold">
                        <RocketLaunchIcon className="h-3 w-3 inline mr-1" />
                        Ready to publish
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          {story.stage && <StageBadge stage={story.stage as StoryStage} />}
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            {/* Show Publish Group button if ready and user has permission */}
            {isGroupReadyToPublish && userCanPublish ? (
              <>
                <Button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setShowPublishModal(true);
                  }}
                  color="primary"
                  className="text-sm"
                  disabled={isPublishing}
                >
                  <RocketLaunchIcon className="h-4 w-4 mr-1" />
                  {isPublishing ? 'Publishing...' : `Publish Group (${1 + translations.length})`}
                </Button>
                <Button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    router.push(`/newsroom/stories/${story.id}`);
                  }}
                  color="white"
                  className="text-sm"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View
                </Button>
              </>
            ) : (
              <Button
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  router.push(`/newsroom/stories/${story.id}`);
                }}
                color="white"
                className="text-sm"
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                View
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Translation Rows (shown when expanded) */}
      {isExpanded &&
        translations.map((translation, index) => (
          <tr
            key={translation.id}
            onClick={() => router.push(`/newsroom/stories/${translation.id}`)}
            className={clsx(
              'cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 focus:outline-none',
              'bg-blue-50/30 dark:bg-blue-900/5 border-l-4 border-l-purple-300',
              'border-b border-gray-200 dark:border-gray-700',
              'transition-all duration-150'
            )}
          >
            <td className="py-4 pl-16 pr-4">
              <div className="flex items-center gap-3">
                {/* Connector line */}
                <div className="w-6 h-px bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>
                <GlobeAltIcon className="h-5 w-5 text-purple-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                      {translation.title}
                    </div>
                    <Badge color="purple" className="text-xs font-medium">
                      Translation
                    </Badge>
                    <Badge color="zinc" className="text-xs">
                      {languageMap[translation.language] || translation.language}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Translation by {translation.author.firstName}{' '}
                      {translation.author.lastName}
                    </span>
                    {translation._count.audioClips > 0 && (
                      <span className="text-kelly-green">
                        {translation._count.audioClips}{' '}
                        {translation._count.audioClips === 1 ? 'clip' : 'clips'}
                      </span>
                    )}
                    {/* Translation progress indicator */}
                    {translation.stage && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">•</span>
                        <MiniStageProgress
                          currentStage={translation.stage as StoryStage}
                          authorRole={translation.authorRole as StaffRole}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </td>
            <td className="py-4 px-4">
              {translation.stage && <StageBadge stage={translation.stage as StoryStage} />}
            </td>
            <td className="py-4 px-4">
              <Button
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  router.push(`/newsroom/stories/${translation.id}`);
                }}
                color="white"
                className="text-sm"
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                View
              </Button>
            </td>
          </tr>
        ))}

      {/* Publish Group Confirmation Modal */}
      {showPublishModal && (
        <tr>
          <td colSpan={3} className="p-0">
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPublishModal(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0">
                      <RocketLaunchIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Publish Story Group
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        You are about to publish the following stories together:
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-4">
                    <li className="flex items-start gap-2">
                      <Badge color="blue" className="text-xs mt-0.5 flex-shrink-0 whitespace-nowrap">Original</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 break-words overflow-wrap-anywhere">
                          {story.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {languageMap[story.language] || story.language}
                        </div>
                      </div>
                    </li>
                    {translations.map((t) => (
                      <li key={t.id} className="flex items-start gap-2">
                        <Badge color="purple" className="text-xs mt-0.5 flex-shrink-0 whitespace-nowrap">Translation</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 break-words overflow-wrap-anywhere">
                            {t.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {languageMap[t.language] || t.language}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All {1 + translations.length} stories will be published immediately and made available to radio stations.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setShowPublishModal(false);
                    }}
                    color="white"
                    disabled={isPublishing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handlePublishGroup();
                    }}
                    color="primary"
                    disabled={isPublishing}
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Group'}
                  </Button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
