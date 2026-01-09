'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Avatar } from '@/components/ui/avatar';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { 
  CalendarIcon,
  MusicalNoteIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface StoryCardProps {
  story: {
    id: string;
    title: string;
    content: string | null;
    category: { id: string; name: string; nameAfrikaans?: string; slug: string } | null;
    author: { firstName: string; lastName: string } | null;
    createdAt: string | Date;
    publishedAt?: string | Date;
    tags: Array<{ id: string; name: string; category: string }>;
    audioClips?: Array<{ id: string; url: string; originalName: string; duration: number | null; mimeType: string }>;
    translations?: Array<{ id: string; title: string; content: string | null; targetLanguage: string }>;
  };
  selectedLanguage?: string;
}

export function StoryCard({ story, selectedLanguage }: StoryCardProps) {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Get language tags
  const languageTags = story.tags?.filter((tag) => tag.category === 'LANGUAGE') || [];
  const hasSelectedLanguage = selectedLanguage ? languageTags.some((tag) => tag.name === selectedLanguage) : true;

  // Get the story content (could be original or translation)
  const displayTitle = story.title;
  const displayContent = story.content;
  
  // Extract text content for preview (remove HTML)
  const textContent = displayContent ? displayContent.replace(/<[^>]*>/g, '').substring(0, 150) : 'No content available';
  
  // Format published date  
  const publishedDate = story.publishedAt ? new Date(story.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) : 'No date';

  // Audio handlers
  const handleAudioPlay = (audioId: string) => {
    setPlayingAudioId(audioId);
  };

  const handleAudioStop = () => {
    setPlayingAudioId(null);
  };

  return (
    <Card className="p-6 h-full flex flex-col hover:shadow-lg transition-shadow bg-white group">
      {/* Header with Category and Languages */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {story.category && (
            <Badge color="zinc" className="text-xs">
              {selectedLanguage === 'Afrikaans' && story.category.nameAfrikaans
                ? story.category.nameAfrikaans
                : story.category.name}
            </Badge>
          )}
          {selectedLanguage && !hasSelectedLanguage && (
            <Badge color="amber" className="text-xs">
              Translation needed
            </Badge>
          )}
          {/* Audio Indicator */}
          {story.audioClips && story.audioClips.length > 0 && (
            <Badge color="green" className="text-xs flex items-center gap-1">
              <MusicalNoteIcon className="h-3 w-3" />
              Audio
            </Badge>
          )}
        </div>
        
        {languageTags.length > 0 && (
          <div className="flex gap-1">
            {languageTags.map((tag) => (
              <Badge 
                key={tag.id}
                color={selectedLanguage && tag.name === selectedLanguage ? "green" : "zinc"}
                className="text-xs"
              >
                {tag.name === 'English' ? 'EN' : 
                 tag.name === 'Afrikaans' ? 'AF' : 
                 tag.name === 'Xhosa' ? 'XH' : tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Story Title and Content */}
      <div className="flex-1">
        <Link 
          href={`/radio/story/${story.id}`}
          className="block group-hover:text-kelly-green transition-colors"
        >
          <Heading level={3} className="text-lg font-semibold text-zinc-900 mb-3 line-clamp-2">
            {displayTitle}
          </Heading>
        </Link>
        
        <Text className="text-zinc-600 text-sm line-clamp-3 mb-4">
          {textContent}...
        </Text>
      </div>

      {/* Audio Section */}
      {story.audioClips && story.audioClips.length > 0 && (
        <div className="mb-4 p-3 bg-zinc-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MusicalNoteIcon className="h-4 w-4 text-kelly-green" />
            <Text className="text-sm font-medium text-zinc-700">
              Audio ({story.audioClips.length} clip{story.audioClips.length !== 1 ? 's' : ''})
            </Text>
          </div>
          
          <div className="space-y-2">
            {story.audioClips.slice(0, 1).map((clip) => (
              <CustomAudioPlayer
                key={clip.id}
                clip={clip}
                isPlaying={playingAudioId === clip.id}
                currentTime={0}
                duration={clip.duration || 0}
                onPlay={handleAudioPlay}
                onStop={handleAudioStop}
                onRestart={(audioId) => handleAudioPlay(audioId)}
                onSeek={() => {}}
                onTimeUpdate={() => {}}
                onLoadedMetadata={() => {}}
                onEnded={() => setPlayingAudioId(null)}
                onError={() => setPlayingAudioId(null)}
                compact={true}
              />
            ))}
            {story.audioClips.length > 1 && (
              <Text className="text-xs text-zinc-500">
                +{story.audioClips.length - 1} more audio clip{story.audioClips.length - 1 !== 1 ? 's' : ''}
              </Text>
            )}
          </div>
        </div>
      )}

      {/* Footer with Author and Date */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
        <div className="flex items-center gap-2">
          {story.author ? (
            <>
              <Avatar
                className="size-8"
                name={`${story.author.firstName} ${story.author.lastName}`}
              />
              <Text className="text-sm text-zinc-500">
                {story.author.firstName} {story.author.lastName}
              </Text>
            </>
          ) : (
            <>
              <UserIcon className="h-4 w-4 text-zinc-400" />
              <Text className="text-sm text-zinc-500">NewsKoop</Text>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <CalendarIcon className="h-4 w-4 text-zinc-400" />
          <Text className="text-sm text-zinc-500">{publishedDate}</Text>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-zinc-100">
        <Link 
          href={`/radio/story/${story.id}`}
          className="inline-flex items-center gap-2 text-kelly-green hover:text-kelly-green-dark text-sm font-medium transition-colors"
        >
          Read Full Story
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </Card>
  );
}