'use client';

import { use, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
import { formatDuration, formatFileSize } from '@/lib/format-utils';

interface AudioClip {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  duration: number | null;
  fileSize: number | null;
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

interface PodcastData {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  category?: { id: string; name: string; slug: string };
  classifications: Array<{ id: string; name: string; type: string }>;
  episodes: Episode[];
}

interface PodcastResponse {
  podcast: PodcastData;
}

export default function PodcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [currentClipIndex, setCurrentClipIndex] = useState<number>(0);

  const { data, isLoading, error } = useQuery<PodcastResponse>({
    queryKey: ['radio-podcast', id],
    queryFn: async () => {
      const response = await fetch(`/api/radio/podcasts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch podcast');
      return response.json();
    },
  });

  const podcast = data?.podcast;
  const episodes = podcast?.episodes || [];

  useEffect(() => {
    if (podcast?.id) {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'PODCAST',
          contentId: podcast.id,
          category: podcast.category?.name,
        }),
      }).catch(err => console.error('Analytics tracking error:', err));
    }
  }, [podcast?.id, podcast?.category?.name]);

  const filteredEpisodes = episodes;

  const languages = podcast?.classifications
    ?.filter(c => c.type === 'LANGUAGE')
    .map(c => c.name) || [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not published';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleAudioPlay = (audioId: string, episodeId: string, clipIndex: number) => {
    setPlayingAudioId(audioId);
    setCurrentEpisodeId(episodeId);
    setCurrentClipIndex(clipIndex);
  };

  const handleAudioEnded = (episode: Episode, clipIndex: number) => {
    const nextIndex = clipIndex + 1;
    if (nextIndex < episode.audioClips.length) {
      const nextClip = episode.audioClips[nextIndex];
      setPlayingAudioId(nextClip.id);
      setCurrentClipIndex(nextIndex);
    } else {
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Container className="pt-24 pb-8">
        <Link
          href="/radio/podcasts"
          className="inline-flex items-center gap-2 text-zinc-600 hover:text-kelly-green mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Podcasts
        </Link>

        {isLoading && (
          <div className="animate-pulse">
            <div className="bg-zinc-200 h-64 rounded-lg mb-6" />
            <div className="h-8 bg-zinc-200 rounded w-1/2 mb-4" />
            <div className="h-4 bg-zinc-200 rounded w-3/4" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <Text className="text-red-800">
              {error instanceof Error ? error.message : 'Failed to load podcast'}
            </Text>
          </div>
        )}

        {podcast && (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
              <div className="md:flex">
                <div className="md:w-80 md:flex-shrink-0">
                  {podcast.coverImageUrl ? (
                    <img
                      src={podcast.coverImageUrl}
                      alt={podcast.title}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 md:h-full bg-zinc-200" />
                  )}
                </div>

                <div className="p-6 md:p-8 flex-1">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {podcast.category && (
                      <Badge color="blue">{podcast.category.name}</Badge>
                    )}
                    {podcast.classifications
                      ?.filter(c => c.type === 'LANGUAGE')
                      .map((c) => (
                        <Badge key={c.id} color="zinc">{c.name}</Badge>
                      ))}
                  </div>

                  <Heading level={1} className="text-3xl font-bold text-zinc-900 mb-4">
                    {podcast.title}
                  </Heading>

                  <Text className="text-zinc-700 leading-relaxed mb-6">
                    {podcast.description || 'No description available'}
                  </Text>

                  <div className="flex items-center gap-6 text-sm text-zinc-600">
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
                <Heading level={2} className="text-2xl font-bold text-zinc-900">
                  Episodes
                </Heading>

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

              {filteredEpisodes.length > 0 ? (
                <div className="space-y-4">
                  {filteredEpisodes.map((episode) => (
                    <div
                      key={episode.id}
                      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge color="zinc">Episode {episode.episodeNumber}</Badge>
                            {episode.publishedAt && (
                              <div className="flex items-center gap-1 text-sm text-zinc-500">
                                <CalendarIcon className="h-4 w-4" />
                                {formatDate(episode.publishedAt)}
                              </div>
                            )}
                          </div>
                          <Heading level={3} className="text-xl font-semibold text-zinc-900 mb-2">
                            {episode.title}
                          </Heading>
                          {episode.description && (
                            <Text className="text-zinc-600 text-sm">
                              {episode.description}
                            </Text>
                          )}
                        </div>
                      </div>

                      {episode.audioClips.length > 0 ? (
                        <div className="mt-4 pt-4 border-t border-zinc-100">
                          <div className="flex items-center justify-between mb-3">
                            <Text className="text-sm font-medium text-zinc-700">
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
                              const isCompleted = currentEpisodeId === episode.id && currentClipIndex > index;

                              return (
                                <div key={clip.id} className={`rounded-lg ${isCurrentClip ? 'ring-2 ring-kelly-green' : ''}`}>
                                  <div className="flex items-center justify-between mb-2 px-1">
                                    <div className="flex items-center gap-2">
                                      <Text className={`text-sm font-medium ${isCurrentClip ? 'text-kelly-green' : isCompleted ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                        Clip {index + 1}: {clip.originalName}
                                      </Text>
                                      {isCurrentClip && (
                                        <Badge color="green" className="text-xs">Now Playing</Badge>
                                      )}
                                      {isCompleted && (
                                        <Badge color="zinc" className="text-xs">Played</Badge>
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

                                  {(isCurrentClip || (!playingAudioId && index === 0) || (!currentEpisodeId && index === 0)) && (
                                    <CustomAudioPlayer
                                      clip={clip}
                                      autoPlay={isCurrentClip && !!playingAudioId}
                                      onPlay={() => handleAudioPlay(clip.id, episode.id, index)}
                                      onEnded={() => handleAudioEnded(episode, index)}
                                      onError={() => {
                                        setPlayingAudioId(null);
                                        toast.error('Failed to play audio clip');
                                      }}
                                    />
                                  )}

                                  {!isCurrentClip && playingAudioId && currentEpisodeId === episode.id && (
                                    <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-500">
                                      <div className="flex items-center gap-3">
                                        {clip.duration && (
                                          <div className="flex items-center gap-1">
                                            <ClockIcon className="h-3 w-3" />
                                            {formatDuration(clip.duration)}
                                          </div>
                                        )}
                                        {clip.fileSize && (
                                          <span>{formatFileSize(clip.fileSize)}</span>
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
                        <div className="mt-4 pt-4 border-t border-zinc-100 text-center">
                          <Text className="text-zinc-500 text-sm">
                            No audio available for this episode
                          </Text>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <PlayCircleIcon className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
                  <Heading level={3} className="text-xl font-semibold text-zinc-900 mb-2">
                    No episodes available
                  </Heading>
                  <Text className="text-zinc-600">
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
