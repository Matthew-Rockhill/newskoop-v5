'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import {
  DocumentTextIcon,
  CalendarDaysIcon,
  ClockIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { formatDateTimeFull } from '@/lib/format';
import { getLanguageColor } from '@/lib/color-system';

interface Story {
  id: string;
  title: string;
  content: string | null;
  author: {
    firstName: string;
    lastName: string;
  };
  category: {
    name: string;
    slug: string;
  };
  tags: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
  publishedAt: string;
  order: number;
  audioClips?: Array<{
    id: string;
    url: string;
    duration: number | null;
    originalName?: string;
    mimeType?: string;
  }>;
}

interface BulletinPreviewProps {
  title: string;
  intro: string;
  outro: string;
  language: string;
  stories: Story[];
  scheduledFor?: string;
  scheduleTitle?: string;
  scheduleTime?: string;
}

export function BulletinPreview({
  title,
  intro,
  outro,
  language,
  stories,
  scheduledFor,
  scheduleTitle,
  scheduleTime,
}: BulletinPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Bulletin Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Heading level={1} className="text-2xl font-bold text-zinc-900 mb-2">
              {title || 'Untitled Bulletin'}
            </Heading>
            <div className="flex items-center gap-3">
              <Badge color={getLanguageColor(language)}>
                {language}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-zinc-600">
                <DocumentTextIcon className="h-4 w-4" />
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Information */}
        {(scheduledFor || (scheduleTitle && scheduleTime)) && (
          <div className="flex items-center gap-4 text-sm text-zinc-600 mb-4 p-3 bg-white rounded-md border">
            {scheduleTitle && scheduleTime && (
              <span className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                {scheduleTitle} at {scheduleTime}
              </span>
            )}
            {scheduledFor && (
              <>
                {scheduleTitle && <span>•</span>}
                <span className="flex items-center gap-1">
                  <CalendarDaysIcon className="h-4 w-4" />
                  {formatDateTimeFull(scheduledFor)}
                </span>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Bulletin Content Preview */}
      <Card className="p-6">
        <Heading level={2} className="text-lg font-semibold text-zinc-900 mb-4">
          Bulletin Content Preview
        </Heading>

        <div className="space-y-4">
          {/* Introduction */}
          <div className="border border-zinc-200 rounded-lg p-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <Badge color="zinc">Intro</Badge>
            </div>
            <div className="prose prose-sm max-w-none text-zinc-700">
              {intro ? (
                <div dangerouslySetInnerHTML={{ __html: intro }} />
              ) : (
                <p className="text-zinc-500 italic">No introduction provided</p>
              )}
            </div>
          </div>

          {/* Stories */}
          {stories.length === 0 ? (
            <div className="text-center py-8 bg-zinc-50 rounded-lg border border-zinc-200">
              <DocumentTextIcon className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
              <Text className="text-zinc-600">No stories selected</Text>
            </div>
          ) : (
            <div className="space-y-4">
              {stories.map((story, index) => (
                <div key={story.id} className="border border-zinc-200 rounded-lg p-4 bg-white">
                  {/* Story Badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge color="zinc">Story {index + 1}</Badge>
                    <Badge color="green">{story.category.name}</Badge>
                    {story.audioClips && story.audioClips.length > 0 && (
                      <Badge color="purple" className="flex items-center gap-1">
                        <SpeakerWaveIcon className="h-3 w-3" />
                        Audio
                      </Badge>
                    )}
                  </div>

                  {/* Story Content */}
                  <div className="prose prose-sm max-w-none text-zinc-700">
                    {story.content ? (
                      <div dangerouslySetInnerHTML={{ __html: story.content }} />
                    ) : (
                      <p className="text-zinc-500 italic">No content available</p>
                    )}
                  </div>

                  {/* Audio Clips */}
                  {story.audioClips && story.audioClips.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {story.audioClips.map((clip) => (
                        <CustomAudioPlayer
                          key={clip.id}
                          clip={{
                            id: clip.id,
                            url: clip.url,
                            originalName: clip.originalName || 'Audio',
                            duration: clip.duration,
                            mimeType: clip.mimeType || 'audio/mpeg',
                          }}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Outro */}
          <div className="border border-zinc-200 rounded-lg p-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <Badge color="zinc">Outro</Badge>
            </div>
            <div className="prose prose-sm max-w-none text-zinc-700">
              {outro ? (
                <div dangerouslySetInnerHTML={{ __html: outro }} />
              ) : (
                <p className="text-zinc-500 italic">No outro provided</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}