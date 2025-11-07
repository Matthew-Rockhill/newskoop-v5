'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { LanguageToggle } from '@/components/radio/LanguageToggle';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  MusicalNoteIcon,
  LanguageIcon,
  TagIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const storyId = params.id as string;

  // Fetch story details
  const { data: storyData, isLoading, error } = useQuery({
    queryKey: ['radio-story', storyId],
    queryFn: async () => {
      const response = await fetch(`/api/radio/stories/${storyId}`);
      if (!response.ok) throw new Error('Failed to fetch story');
      return response.json();
    },
    enabled: !!session && !!storyId,
  });

  const story = storyData?.story;

  // Debug logging
  console.log('Story Data:', storyData);
  console.log('Story:', story);

  // Fetch translations for this story
  const { data: translationsData } = useQuery({
    queryKey: ['story-translations', storyId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/stories/${storyId}/translations`);
      if (!response.ok) return { translations: [] };
      return response.json();
    },
    enabled: !!story && !!storyId,
  });

  const translations = translationsData?.translations || [];
  
  // Find the story/translation to display based on selected language
  const getDisplayContent = () => {
    if (selectedLanguage === 'English' && story?.language === 'ENGLISH') {
      return story;
    }
    
    // Find translation for selected language
    const translation = translations.find((t: any) => 
      t.targetLanguage.toLowerCase() === selectedLanguage.toLowerCase() && 
      t.status === 'PUBLISHED' &&
      t.translatedStory
    );
    
    return translation?.translatedStory || story;
  };

  const displayContent = getDisplayContent();
  const isTranslation = displayContent?.id !== story?.id;

  // Available languages for this story
  const availableLanguages: string[] = [];
  if (story?.language === 'ENGLISH') availableLanguages.push('English');
  
  translations.forEach((t: any) => {
    if (t.status === 'PUBLISHED' && t.translatedStory) {
      if (t.targetLanguage === 'AFRIKAANS' && !availableLanguages.includes('Afrikaans')) {
        availableLanguages.push('Afrikaans');
      }
      if (t.targetLanguage === 'XHOSA' && !availableLanguages.includes('Xhosa')) {
        availableLanguages.push('Xhosa');
      }
    }
  });

  // Audio handlers
  const handleAudioPlay = (audioId: string) => {
    setPlayingAudioId(audioId);
  };

  const handleAudioStop = () => {
    setPlayingAudioId(null);
  };

  const handleAudioRestart = (audioId: string) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: 0 }));
    setPlayingAudioId(audioId);
  };

  const handleAudioSeek = (audioId: string, time: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: time }));
  };

  const handleAudioTimeUpdate = (audioId: string, currentTime: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: currentTime }));
  };

  const handleAudioLoadedMetadata = (audioId: string, duration: number) => {
    setAudioDuration(prev => ({ ...prev, [audioId]: duration }));
  };

  // Utility functions
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Story - ${displayContent?.title || 'Story'}</title>
          <style>
            @media print {
              @page {
                margin: 2cm;
                size: A4;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              max-width: 100%;
              margin: 0;
              padding: 20px;
            }
            .header {
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 22px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 15px;
              line-height: 1.2;
            }
            .metadata {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            .metadata-item {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            .badge {
              background: #f3f4f6;
              color: #374151;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
            }
            .content {
              font-size: 16px;
              line-height: 1.7;
            }
            .content p {
              margin-bottom: 16px;
            }
            .content h1, .content h2, .content h3 {
              margin-top: 24px;
              margin-bottom: 12px;
            }
            .audio-note {
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 8px;
              padding: 12px;
              margin: 20px 0;
              font-size: 14px;
              color: #0369a1;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${displayContent?.title || 'Story Title'}</h1>
            <div class="metadata">
              <div class="metadata-item">
                📅 ${publishedDate}
              </div>
              <div class="metadata-item">
                👤 ${story.author ? `${story.author.firstName} ${story.author.lastName}` : 'NewsKoop'}
              </div>
              ${story.category ? `<span class="badge">${story.category.name}</span>` : ''}
              ${isTranslation ? `<span class="badge">${selectedLanguage} Translation</span>` : ''}
            </div>
          </div>
          <div class="content">
            ${displayContent?.content || '<p>Content not available</p>'}
          </div>
          ${story.audioClips?.length > 0 ? `
            <div class="audio-note">
              🎵 This story includes ${story.audioClips.length} audio clip${story.audioClips.length !== 1 ? 's' : ''} (available in digital version)
            </div>
          ` : ''}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const handleDownload = () => {
    if (!displayContent || !story) return;

    const publishedDate = story?.publishedAt
      ? new Date(story.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Date not available';

    // Create text content
    const textContent = `
${displayContent.title}

Published: ${publishedDate}
Author: ${story.author ? `${story.author.firstName} ${story.author.lastName}` : 'NewsKoop'}
Category: ${story.category ? story.category.name : 'Uncategorized'}
${isTranslation ? `Language: ${selectedLanguage} Translation` : ''}

${displayContent.content ? displayContent.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : 'Content not available'}

${story.audioClips?.length > 0 ? `\n---\nThis story includes ${story.audioClips.length} audio clip${story.audioClips.length !== 1 ? 's' : ''}\n` : ''}

---
Downloaded from NewsKoop Radio Station Zone
    `.trim();

    // Create blob and download
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${displayContent.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Container className="py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Container>
    );
  }

  if (error || !story) {
    return (
      <Container className="py-12">
        <div className="text-center">
          <Heading level={2} className="text-red-600 mb-4">Story Not Found</Heading>
          <Text className="text-gray-600 mb-6">
            The story you're looking for doesn't exist or isn't available to your station.
            {error && <><br/>Error: {error.message}</>}
          </Text>
          <Button color="primary" onClick={() => router.push('/radio')}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Radio Station Zone
          </Button>
        </div>
      </Container>
    );
  }

  const publishedDate = story?.publishedAt 
    ? new Date(story.publishedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date not available';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Container className="py-8">
        {/* Back Navigation */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Button
              color="white"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Radio Station Zone
            </Button>
            
            {story.category && (
              <Button
                color="white"
                onClick={() => router.push(`/radio/${story.category.slug}`)}
                className="flex items-center gap-2"
              >
                <TagIcon className="h-4 w-4" />
                {story.category.name}
              </Button>
            )}
          </div>
        </div>

        {/* Story Hero Card */}
        <Card className="mb-12 bg-white shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-kelly-green to-kelly-green-dark p-8">
            <div className="flex items-start justify-between">
              {/* Story Information */}
              <div className="flex-1 text-white">
                <Heading level={1} className="text-3xl font-bold text-white mb-3">
                  {displayContent?.title}
                </Heading>
                <div className="flex items-center flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <CalendarIcon className="h-4 w-4 text-gray-600" />
                    <span>{publishedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    {story.author ? (
                      <>
                        <Avatar
                          className="h-6 w-6"
                          name={`${story.author.firstName} ${story.author.lastName}`}
                        />
                        <span>{story.author.firstName} {story.author.lastName}</span>
                      </>
                    ) : (
                      <>
                        <UserIcon className="h-4 w-4 text-gray-600" />
                        <span>NewsKoop</span>
                      </>
                    )}
                  </div>
                  {story.audioClips?.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <MusicalNoteIcon className="h-4 w-4 text-gray-600" />
                      <span>{story.audioClips.length} audio clip{story.audioClips.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {story.category && (
                    <Badge color="blue" className="font-medium">
                      {story.category.name}
                    </Badge>
                  )}
                  {isTranslation && (
                    <Badge color="purple" className="font-medium">
                      <LanguageIcon className="h-3 w-3 mr-1" />
                      {selectedLanguage} Translation
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-start gap-3">
                {availableLanguages.length > 1 && (
                  <LanguageToggle
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={setSelectedLanguage}
                    availableLanguages={availableLanguages}
                  />
                )}
                <Button
                  color="white"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  color="white"
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          </div>
          
          {/* Story Info Bar */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-gray-600">Word Count:</Text>
                    <Badge color="blue" className="text-xs">
                      {displayContent?.content ? 
                        displayContent.content.replace(/<[^>]*>/g, '').split(/\s+/).filter((word: string) => word.length > 0).length 
                        : 0} words
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-gray-600">Audio:</Text>
                    <Badge color="zinc" className="text-xs">
                      {story.audioClips?.length > 0 ? 
                        `${story.audioClips.length} clip${story.audioClips.length !== 1 ? 's' : ''}` : 
                        'No audio'
                      }
                    </Badge>
                  </div>
                </div>
                {availableLanguages.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-gray-600">Available Languages:</Text>
                    <div className="flex gap-1">
                      {availableLanguages.map((lang: string) => (
                        <Badge key={lang} color="zinc" className="text-xs">
                          {lang === 'English' ? 'EN' : lang === 'Afrikaans' ? 'AF' : 'XH'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Text className="text-sm text-gray-600">
                  Last updated: {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* Story Content Card */}
        <Card className="p-8 bg-white shadow-lg">
          {/* Story Content */}
          <div className="prose prose-lg max-w-none mb-8">
            <div 
              className="text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: displayContent?.content || '<p>Content not available</p>' }}
            />
          </div>

          {/* Audio Section */}
          {story.audioClips && story.audioClips.length > 0 && (
            <div className="border-t border-gray-200 pt-8">
              <div className="flex items-center gap-2 mb-6">
                <MusicalNoteIcon className="h-6 w-6 text-kelly-green" />
                <Heading level={3} className="text-xl font-semibold text-gray-900">
                  Audio Content ({story.audioClips.length} clip{story.audioClips.length !== 1 ? 's' : ''})
                </Heading>
              </div>
              
              <div className="space-y-4">
                {story.audioClips.map((clip: any) => (
                  <Card key={clip.id} className="p-4 bg-gray-50">
                    <CustomAudioPlayer
                      clip={clip}
                      isPlaying={playingAudioId === clip.id}
                      currentTime={audioProgress[clip.id] || 0}
                      duration={audioDuration[clip.id] || 0}
                      onPlay={handleAudioPlay}
                      onStop={handleAudioStop}
                      onRestart={handleAudioRestart}
                      onSeek={handleAudioSeek}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onLoadedMetadata={handleAudioLoadedMetadata}
                      onEnded={() => setPlayingAudioId(null)}
                      onError={() => setPlayingAudioId(null)}
                    />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </Card>
      </Container>
    </div>
  );
}