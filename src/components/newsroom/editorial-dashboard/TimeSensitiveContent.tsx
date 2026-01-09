'use client';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TimeSensitiveStory } from '@/lib/editorial-metrics';
import {
  ClockIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Link from 'next/link';

interface TimeSensitiveContentProps {
  stories: TimeSensitiveStory[];
  isLoading?: boolean;
  onViewStory?: (storyId: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  NEEDS_JOURNALIST_REVIEW: 'In Review',
  NEEDS_SUB_EDITOR_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  TRANSLATED: 'Translated',
};

export function TimeSensitiveContent({
  stories,
  isLoading,
  onViewStory,
}: TimeSensitiveContentProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-zinc-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const overdueStories = stories.filter((s) => s.isOverdue);
  const upcomingStories = stories.filter((s) => !s.isOverdue);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="h-6 w-6 text-orange-600" />
        <Heading level={2} className="text-xl font-semibold text-zinc-900">
          Time-Sensitive Content
        </Heading>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-8 text-zinc-400">
          <Text>No time-sensitive content</Text>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue Section */}
          {overdueStories.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <Heading level={3} className="text-lg font-semibold text-red-600">
                  Overdue ({overdueStories.length})
                </Heading>
              </div>

              <div className="space-y-3">
                {overdueStories.map((story) => (
                  <div
                    key={story.id}
                    className="p-4 border-2 border-red-300 bg-red-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/newsroom/stories/${story.id}`}
                          className="font-medium text-zinc-900 hover:text-kelly-green truncate block mb-2"
                        >
                          {story.title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <span className="px-2 py-1 bg-white text-zinc-700 rounded text-xs font-medium">
                            {story.stage ? (STAGE_LABELS[story.stage] || story.stage) : 'Unknown'}
                          </span>

                          <div className="flex items-center gap-1 text-zinc-600">
                            <CalendarIcon className="h-4 w-4" />
                            {story.followUpDate && (
                              <span>Follow-up: {format(new Date(story.followUpDate), 'MMM d')}</span>
                            )}
                            {story.scheduledPublishAt && (
                              <span>
                                Scheduled: {format(new Date(story.scheduledPublishAt), 'MMM d, HH:mm')}
                              </span>
                            )}
                          </div>

                          <span className="font-semibold text-red-600">
                            {Math.abs(story.daysUntilDue!)} days overdue
                          </span>

                          <Text className="text-xs text-zinc-500">By {story.authorName}</Text>
                        </div>
                      </div>

                      <Button
                        color="white"
                        className="text-xs flex-shrink-0"
                        onClick={() => onViewStory?.(story.id)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcomingStories.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="h-5 w-5 text-orange-600" />
                <Heading level={3} className="text-lg font-semibold text-zinc-900">
                  Upcoming ({upcomingStories.length})
                </Heading>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {upcomingStories.map((story) => (
                  <div
                    key={story.id}
                    className={`p-4 border rounded-lg ${
                      story.daysUntilDue! <= 1
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/newsroom/stories/${story.id}`}
                          className="font-medium text-zinc-900 hover:text-kelly-green truncate block mb-2"
                        >
                          {story.title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <span className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-xs font-medium">
                            {story.stage ? (STAGE_LABELS[story.stage] || story.stage) : 'Unknown'}
                          </span>

                          <div className="flex items-center gap-1 text-zinc-600">
                            <CalendarIcon className="h-4 w-4" />
                            {story.followUpDate && (
                              <span>Follow-up: {format(new Date(story.followUpDate), 'MMM d')}</span>
                            )}
                            {story.scheduledPublishAt && (
                              <span>
                                Scheduled: {format(new Date(story.scheduledPublishAt), 'MMM d, HH:mm')}
                              </span>
                            )}
                          </div>

                          <span
                            className={`font-medium ${
                              story.daysUntilDue! <= 1 ? 'text-yellow-600' : 'text-zinc-600'
                            }`}
                          >
                            {story.daysUntilDue === 0
                              ? 'Due today'
                              : story.daysUntilDue === 1
                              ? 'Due tomorrow'
                              : `${story.daysUntilDue} days`}
                          </span>

                          <Text className="text-xs text-zinc-500">By {story.authorName}</Text>
                        </div>
                      </div>

                      <Button
                        color="white"
                        className="text-xs flex-shrink-0"
                        onClick={() => onViewStory?.(story.id)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
