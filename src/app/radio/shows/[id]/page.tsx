'use client';

import { use, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PlayCircleIcon,
  ArrowLeftIcon,
  ClockIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { CustomAudioPlayer } from '@/components/ui/audio-player';

interface AudioClip {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  duration?: number;
  fileSize?: number;
  mimeType: string;
}

interface Episode {
  id: string;
  title: string;
  description?: string;
  episodeNumber: number;
  status: string;
  publishedAt?: string;
  audioClips: AudioClip[];
}

interface Show {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
      category: string;
    };
  }>;
  episodes: Episode[];
}

interface ShowResponse {
  show: Show;
}

export default function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [currentClipIndex, setCurrentClipIndex] = useState<number>(0);

  // Fetch show details
  const { data, isLoading, error } = useQuery<ShowResponse>({
    queryKey: ['radio-show', id],
    queryFn: async () => {
      const response = await fetch(`/api/radio/shows/${id}`);
      if (!response.ok) throw new Error('Failed to fetch show');
      return response.json();
    },
  });

  const show = data?.show;
  const episodes = show?.episodes || [];

  // Track view after show loads
  useEffect(() => {
    if (show?.id) {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'SHOW',
          contentId: show.id,
          category: show.category?.name,
        }),
      }).catch(err => console.error('Analytics tracking error:', err));
    }
  }, [show?.id, show?.category?.name]);

  // Filter episodes by language
  const filteredEpisodes = selectedLanguage === 'all'
    ? episodes
    : episodes; // Episodes inherit show language, so no filtering needed here

  const languages = show?.tags
    .filter(t => t.tag.category === 'LANGUAGE')
    .map(t => t.tag.name) || [];

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not published';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Audio player handlers
  const handleAudioPlay = (audioId: string, episodeId: string, clipIndex: number) => {
    setPlayingAudioId(audioId);
    setCurrentEpisodeId(episodeId);
    setCurrentClipIndex(clipIndex);
  };

  const handleAudioStop = () => {
    setPlayingAudioId(null);
  };

  const handleAudioRestart = (audioId: string) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: 0 }));
  };

  const handleAudioSeek = (audioId: string, time: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: time }));
  };

  const handleAudioTimeUpdate = (audioId: string, time: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: time }));
  };

  const handleAudioLoadedMetadata = (audioId: string, duration: number) => {
    setAudioDuration(prev => ({ ...prev, [audioId]: duration }));
  };

  const handleAudioEnded = (episode: Episode, clipIndex: number) => {
    const nextIndex = clipIndex + 1;
    if (nextIndex < episode.audioClips.length) {
      // Auto-advance to next clip in playlist
      const nextClip = episode.audioClips[nextIndex];
      setPlayingAudioId(nextClip.id);
      setCurrentClipIndex(nextIndex);
    } else {
      // Playlist finished
      setPlayingAudioId(null);
      setCurrentEpisodeId(null);
      setCurrentClipIndex(0);
    }
  };

  const handleDownloadAudio = (audioUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Container className="py-8">
        {/* Back Button */}
        <Link
          href="/radio/shows"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-kelly-green mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Shows
        </Link>

        {/* Loading State */}
        {isLoading && (
          <div className="animate-pulse">
            <div className="bg-gray-200 h-64 rounded-lg mb-6" />
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <Text className="text-red-800">
              {error instanceof Error ? error.message : 'Failed to load show'}
            </Text>
          </div>
        )}

        {/* Show Details */}
        {show && (
          <>
            {/* Show Header */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
              <div className="md:flex">
                {/* Cover Image */}
                <div className="md:w-80 md:flex-shrink-0">
                  {show.coverImageUrl ? (
                    <img
                      src={show.coverImageUrl}
                      alt={show.title}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 md:h-full bg-gray-200" />
                  )}
                </div>

                {/* Show Info */}
                <div className="p-6 md:p-8 flex-1">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {show.category && (
                      <Badge color="blue">{show.category.name}</Badge>
                    )}
                    {show.tags
                      .filter(t => t.tag.category === 'LANGUAGE')
                      .map(({ tag }) => (
                        <Badge key={tag.id} color="zinc">{tag.name}</Badge>
                      ))}
                  </div>

                  <Heading level={1} className="text-3xl font-bold text-gray-900 mb-4">
                    {show.title}
                  </Heading>

                  <Text className="text-gray-700 leading-relaxed mb-6">
                    {show.description || 'No description available'}
                  </Text>

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <PlayCircleIcon className="h-5 w-5" />
                      <span>{episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Episodes Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <Heading level={2} className="text-2xl font-bold text-gray-900">
                  Episodes
                </Heading>

                {/* Language Filter for Episodes */}
                {languages.length > 1 && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedLanguage('all')}
                      color={selectedLanguage === 'all' ? 'primary' : 'white'}
                      className="text-sm"
                    >
                      All
                    </Button>
                    {languages.map((lang) => (
                      <Button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        color={selectedLanguage === lang ? 'primary' : 'white'}
                        className="text-sm"
                      >
                        {lang}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Episodes List */}
              {filteredEpisodes.length > 0 ? (
                <div className="space-y-4">
                  {filteredEpisodes.map((episode) => (
                    <div
                      key={episode.id}
                      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                    >
                      {/* Episode Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge color="zinc">Episode {episode.episodeNumber}</Badge>
                            {episode.publishedAt && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <CalendarIcon className="h-4 w-4" />
                                {formatDate(episode.publishedAt)}
                              </div>
                            )}
                          </div>
                          <Heading level={3} className="text-xl font-semibold text-gray-900 mb-2">
                            {episode.title}
                          </Heading>
                          {episode.description && (
                            <Text className="text-gray-600 text-sm">
                              {episode.description}
                            </Text>
                          )}
                        </div>
                      </div>

                      {/* Audio Playlist */}
                      {episode.audioClips.length > 0 ? (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <Text className="text-sm font-medium text-gray-700">
                              Audio Playlist ({episode.audioClips.length} {episode.audioClips.length === 1 ? 'clip' : 'clips'})
                            </Text>
                            {currentEpisodeId === episode.id && playingAudioId && (
                              <Badge color="green" className="text-xs">
                                Playing: Clip {currentClipIndex + 1} of {episode.audioClips.length}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-3">
                            {episode.audioClips.map((clip, index) => {
                              const isCurrentClip = currentEpisodeId === episode.id && currentClipIndex === index;
                              const isPlaying = playingAudioId === clip.id;
                              const isCompleted = currentEpisodeId === episode.id && currentClipIndex > index;

                              return (
                                <div key={clip.id} className={`rounded-lg ${isCurrentClip ? 'ring-2 ring-kelly-green' : ''}`}>
                                  {/* Clip Header */}
                                  <div className="flex items-center justify-between mb-2 px-1">
                                    <div className="flex items-center gap-2">
                                      <Text className={`text-sm font-medium ${isCurrentClip ? 'text-kelly-green' : isCompleted ? 'text-gray-400' : 'text-gray-700'}`}>
                                        Clip {index + 1}: {clip.originalName}
                                      </Text>
                                      {isCurrentClip && (
                                        <Badge color="green" className="text-xs">
                                          Now Playing
                                        </Badge>
                                      )}
                                      {isCompleted && (
                                        <Badge color="zinc" className="text-xs">
                                          ✓ Played
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      onClick={() => handleDownloadAudio(clip.url, clip.originalName)}
                                      outline
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <ArrowDownTrayIcon className="h-3 w-3" />
                                      Download
                                    </Button>
                                  </div>

                                  {/* Audio Player - Show for current clip or if nothing is playing */}
                                  {(isCurrentClip || (!playingAudioId && index === 0) || (!currentEpisodeId && index === 0)) && (
                                    <CustomAudioPlayer
                                      clip={clip}
                                      isPlaying={isPlaying}
                                      currentTime={audioProgress[clip.id] || 0}
                                      duration={audioDuration[clip.id] || 0}
                                      onPlay={() => handleAudioPlay(clip.id, episode.id, index)}
                                      onStop={handleAudioStop}
                                      onRestart={() => handleAudioRestart(clip.id)}
                                      onSeek={(time) => handleAudioSeek(clip.id, time)}
                                      onTimeUpdate={(time) => handleAudioTimeUpdate(clip.id, time)}
                                      onLoadedMetadata={(duration) => handleAudioLoadedMetadata(clip.id, duration)}
                                      onEnded={() => handleAudioEnded(episode, index)}
                                      onError={() => {
                                        setPlayingAudioId(null);
                                        console.error('Error playing audio clip:', clip.id);
                                      }}
                                    />
                                  )}

                                  {/* Show compact info for non-active clips */}
                                  {!isCurrentClip && playingAudioId && currentEpisodeId === episode.id && (
                                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                                      <div className="flex items-center gap-3">
                                        {clip.duration && (
                                          <div className="flex items-center gap-1">
                                            <ClockIcon className="h-3 w-3" />
                                            {formatDuration(clip.duration)}
                                          </div>
                                        )}
                                        {clip.fileSize && (
                                          <span>{(clip.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                          <Text className="text-gray-500 text-sm">
                            No audio available for this episode
                          </Text>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <PlayCircleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <Heading level={3} className="text-xl font-semibold text-gray-900 mb-2">
                    No episodes available
                  </Heading>
                  <Text className="text-gray-600">
                    Check back later for new episodes.
                  </Text>
                </div>
              )}
            </div>
          </>
        )}
      </Container>
    </div>
  );
}
