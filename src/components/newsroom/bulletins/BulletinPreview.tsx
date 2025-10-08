'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import {
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'ENGLISH': return 'blue';
      case 'AFRIKAANS': return 'green';
      case 'XHOSA': return 'purple';
      default: return 'zinc';
    }
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    // Strip HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...' 
      : textContent;
  };

  const renderRichText = (content: string) => {
    // Basic HTML rendering for preview
    return (
      <div 
        className="prose prose-sm max-w-none" 
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Bulletin Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Heading level={1} className="text-2xl font-bold text-gray-900 mb-2">
              {title || 'Untitled Bulletin'}
            </Heading>
            <div className="flex items-center gap-3">
              <Badge color={getLanguageColor(language)}>
                {language}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-gray-600">
                <DocumentTextIcon className="h-4 w-4" />
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Information */}
        {(scheduledFor || (scheduleTitle && scheduleTime)) && (
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 p-3 bg-white rounded-md border">
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
                  {formatDate(scheduledFor)}
                </span>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Bulletin Content Preview */}
      <Card className="p-6">
        <Heading level={2} className="text-lg font-semibold text-gray-900 mb-4">
          Bulletin Content Preview
        </Heading>
        
        <div className="space-y-6">
          {/* Introduction */}
          <div className="bg-green-50 border-l-4 border-green-400 pl-4 py-3">
            <Heading level={3} className="text-sm font-semibold text-green-800 mb-2">
              INTRODUCTION
            </Heading>
            <div className="text-green-700">
              {intro ? renderRichText(intro) : (
                <Text className="italic text-gray-500">No introduction provided</Text>
              )}
            </div>
          </div>

          {/* Stories */}
          <div className="space-y-4">
            <Heading level={3} className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Stories ({stories.length})
            </Heading>
            
            {stories.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <Text className="text-gray-600">No stories selected</Text>
              </div>
            ) : (
              <div className="space-y-4">
                {stories.map((story, index) => (
                  <div key={story.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    {/* Story Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Heading level={4} className="font-semibold text-gray-900">
                            {story.title}
                          </Heading>
                          <Badge color="green">
                            {story.category.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {story.author.firstName} {story.author.lastName}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {new Date(story.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Story Content */}
                    <div className="prose prose-sm max-w-none text-gray-700 mb-3">
                      {story.content ? (
                        <div dangerouslySetInnerHTML={{ __html: story.content }} />
                      ) : (
                        <p className="text-gray-500 italic">No content available</p>
                      )}
                    </div>

                    {/* Audio Player */}
                    {(story as any).audioUrl && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6h1.5M12 9v6M9 21V3l3-3 3 3v18" />
                          </svg>
                          <Text className="text-sm font-medium text-blue-900">Audio Version</Text>
                        </div>
                        <audio
                          controls
                          className="w-full h-8"
                          preload="metadata"
                        >
                          <source src={(story as any).audioUrl} type="audio/mpeg" />
                          <source src={(story as any).audioUrl} type="audio/wav" />
                          <source src={(story as any).audioUrl} type="audio/ogg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}

                    {/* Story Tags */}
                    {story.tags && story.tags.filter(tag => tag.category !== 'LANGUAGE').length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Text className="text-xs text-gray-500 font-medium">Tags:</Text>
                          {story.tags
                            .filter(tag => tag.category !== 'LANGUAGE')
                            .map((tag) => (
                            <Badge key={tag.id} color="zinc">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outro */}
          <div className="bg-blue-50 border-l-4 border-blue-400 pl-4 py-3">
            <Heading level={3} className="text-sm font-semibold text-blue-800 mb-2">
              OUTRO
            </Heading>
            <div className="text-blue-700">
              {outro ? renderRichText(outro) : (
                <Text className="italic text-gray-500">No outro provided</Text>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Bulletin Statistics */}
      <Card className="p-6 bg-gray-50">
        <Heading level={3} className="text-lg font-semibold text-gray-900 mb-4">
          Bulletin Statistics
        </Heading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#76BD43]">
              {stories.length}
            </div>
            <Text className="text-sm text-gray-600">
              {stories.length === 1 ? 'Story' : 'Stories'}
            </Text>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {intro.replace(/<[^>]*>/g, '').split(' ').filter(word => word.length > 0).length}
            </div>
            <Text className="text-sm text-gray-600">Intro Words</Text>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {outro.replace(/<[^>]*>/g, '').split(' ').filter(word => word.length > 0).length}
            </div>
            <Text className="text-sm text-gray-600">Outro Words</Text>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {stories.reduce((total, story) => {
                if (!story.content) return total;
                const words = story.content.replace(/<[^>]*>/g, '').split(' ').filter(word => word.length > 0);
                return total + words.length;
              }, 0)}
            </div>
            <Text className="text-sm text-gray-600">Story Words</Text>
          </div>
        </div>
      </Card>

      {/* Reading Instructions */}
      <Card className="p-4 bg-yellow-50 border border-yellow-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <Text className="text-sm text-yellow-800">
              <strong>Reading Order:</strong> This bulletin will be read as Introduction → Stories (in order) → Outro.
              Make sure the flow makes sense and stories are ordered appropriately.
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}