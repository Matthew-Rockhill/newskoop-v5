'use client';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StoryQueueItem } from '@/lib/editorial-metrics';
import {
  UserIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Link from 'next/link';

interface QueueDetailProps {
  title: string;
  stories: StoryQueueItem[];
  type: 'review' | 'approval';
  isLoading?: boolean;
  onReassign?: (storyId: string) => void;
  onViewStory?: (storyId: string) => void;
}

export function QueueDetail({
  title,
  stories,
  type,
  isLoading,
  onReassign,
  onViewStory,
}: QueueDetailProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const sortedStories = [...stories].sort((a, b) => b.daysInStage - a.daysInStage);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Heading level={2} className="text-xl font-semibold text-gray-900">
          {title}
        </Heading>
        <div className="text-sm">
          <span className="font-semibold text-gray-900">{stories.length}</span>
          <span className="text-gray-600 ml-1">
            {stories.length === 1 ? 'story' : 'stories'}
          </span>
        </div>
      </div>

      {sortedStories.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Text>No stories in this queue</Text>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {sortedStories.map((story) => (
            <div
              key={story.id}
              className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                story.daysInStage > 3 ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title and Category */}
                  <div className="flex items-start gap-2 mb-2">
                    <Link
                      href={`/newsroom/stories/${story.id}`}
                      className="font-medium text-gray-900 hover:text-[#76BD43] truncate flex-1"
                    >
                      {story.title}
                    </Link>
                    {story.category && (
                      <span className="flex-shrink-0 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {story.category}
                      </span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-4 w-4" />
                      <span>By {story.authorName}</span>
                    </div>

                    {story.assignedToName && (
                      <div className="flex items-center gap-1">
                        <ArrowPathIcon className="h-4 w-4" />
                        <span>Assigned to {story.assignedToName}</span>
                      </div>
                    )}

                    {!story.assignedToName && (
                      <span className="text-yellow-600 font-medium">Unassigned</span>
                    )}

                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      <span
                        className={
                          story.daysInStage > 3
                            ? 'font-semibold text-red-600'
                            : story.daysInStage > 1
                            ? 'font-medium text-yellow-600'
                            : 'text-gray-600'
                        }
                      >
                        {story.daysInStage === 0 ? 'Today' : `${story.daysInStage}d in queue`}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      Updated {format(new Date(story.lastModified), 'MMM d, HH:mm')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    color="white"
                    className="text-xs"
                    onClick={() => onViewStory?.(story.id)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    color="white"
                    className="text-xs"
                    onClick={() => onReassign?.(story.id)}
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Reassign
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
