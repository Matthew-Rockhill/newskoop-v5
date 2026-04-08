'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import {
  PlayCircleIcon,
  MusicalNoteIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface PodcastItem {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  category?: { id: string; name: string; slug: string };
  classifications: Array<{ id: string; name: string; type: string }>;
  _count: { episodes: number };
}

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
  description?: string | null;
  episodeNumber: number;
  status: string;
  publishedAt?: string | null;
  coverImage?: string | null;
  podcast: {
    id: string;
    title: string;
    slug: string;
    coverImage?: string | null;
    classifications: Array<{ id: string; name: string; type: string }>;
  };
  audioClips: AudioClip[];
  publisher?: { id: string; firstName: string; lastName: string } | null;
}

export default function PodcastsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [selectedPodcast, setSelectedPodcast] = useState<string | null>(
    searchParams.get('podcastId')
  );
  const [currentPage, setCurrentPage] = useState(1);

  const { data: profileData } = useQuery({
    queryKey: ['radio-profile'],
    queryFn: async () => {
      const response = await fetch('/api/radio/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!session,
  });

  const defaultLanguage = profileData?.user?.defaultLanguagePreference || 'English';
  const [selectedLanguage, setSelectedLanguage] = useState<string>(defaultLanguage);

  useEffect(() => {
    if (profileData?.user?.defaultLanguagePreference) {
      setSelectedLanguage(profileData.user.defaultLanguagePreference);
    }
  }, [profileData?.user?.defaultLanguagePreference]);

  const { data: podcastsData } = useQuery({
    queryKey: ['radio-podcasts-list'],
    queryFn: async () => {
      const response = await fetch('/api/radio/podcasts?perPage=100');
      if (!response.ok) throw new Error('Failed to fetch podcasts');
      return response.json();
    },
    enabled: !!session,
  });

  const podcasts: PodcastItem[] = podcastsData?.podcasts || [];
  const station = podcastsData?.station;

  const { data: episodesData, isLoading } = useQuery({
    queryKey: ['radio-podcast-episodes', selectedPodcast, selectedLanguage, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        perPage: '12',
      });
      if (selectedPodcast) params.set('podcastId', selectedPodcast);
      if (selectedLanguage) params.set('language', selectedLanguage);

      const response = await fetch(`/api/radio/podcasts/episodes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch episodes');
      return response.json();
    },
    enabled: !!session,
  });

  const episodes: Episode[] = episodesData?.episodes || [];
  const pagination = episodesData?.pagination;

  const stationData = station || episodesData?.station;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPodcast, selectedLanguage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Container className="pt-24 pb-8">
        <div className="mb-8">
          <PageHeader
            title="Podcasts"
            description="Browse episodes from our podcasts"
            actions={
              <div className="flex items-center gap-2">
                <Text className="text-sm text-zinc-600">Language:</Text>
                <div className="flex gap-1">
                  {(stationData?.allowedLanguages || ['English', 'Afrikaans', 'Xhosa']).map((lang: string) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedLanguage === lang
                          ? 'bg-kelly-green text-white border-kelly-green'
                          : 'bg-white text-zinc-600 border-zinc-300 hover:border-kelly-green hover:text-kelly-green'
                      }`}
                    >
                      {lang === 'English' ? 'EN' :
                       lang === 'Afrikaans' ? 'AF' :
                       lang === 'Xhosa' ? 'XH' : lang}
                    </button>
                  ))}
                </div>
              </div>
            }
          />
        </div>

        {/* Podcast Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2" role="tablist" aria-label="Filter by podcast">
            <button
              role="tab"
              aria-selected={!selectedPodcast}
              onClick={() => setSelectedPodcast(null)}
              className={`px-4 py-2 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
                !selectedPodcast
                  ? 'bg-kelly-green text-white border-kelly-green'
                  : 'bg-white text-zinc-600 border-zinc-300 hover:border-kelly-green hover:text-kelly-green'
              }`}
            >
              All
            </button>
            {podcasts.map(podcast => (
              <button
                key={podcast.id}
                role="tab"
                aria-selected={selectedPodcast === podcast.id}
                onClick={() => setSelectedPodcast(podcast.id)}
                className={`px-4 py-2 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
                  selectedPodcast === podcast.id
                    ? 'bg-kelly-green text-white border-kelly-green'
                    : 'bg-white text-zinc-600 border-zinc-300 hover:border-kelly-green hover:text-kelly-green'
                }`}
              >
                {podcast.title}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse bg-white">
                <div className="h-4 bg-zinc-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-zinc-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-zinc-200 rounded mb-4"></div>
                <div className="h-3 bg-zinc-200 rounded w-1/4"></div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {episodes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {episodes.map(episode => (
                  <PodcastEpisodeCard key={episode.id} episode={episode} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center bg-white">
                <PlayCircleIcon className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
                <Heading level={3} className="text-zinc-500 mb-2">
                  No episodes available
                </Heading>
                <Text className="text-zinc-400 mb-4">
                  {selectedLanguage !== 'English'
                    ? `No episodes available in ${selectedLanguage}. Try switching languages.`
                    : selectedPodcast
                    ? 'No episodes available for this podcast. Try selecting a different one.'
                    : 'Check back later for new episodes.'
                  }
                </Text>
                {selectedLanguage !== 'English' && (
                  <Button color="white" onClick={() => setSelectedLanguage('English')}>
                    Switch to English
                  </Button>
                )}
              </Card>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  color="white"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                    const pageNumber = Math.max(1, currentPage - 2) + i;
                    if (pageNumber > pagination.totalPages) return null;

                    return (
                      <Button
                        key={pageNumber}
                        color={pageNumber === currentPage ? 'primary' : 'white'}
                        onClick={() => setCurrentPage(pageNumber)}
                        className="min-w-[40px]"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  color="white"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}

function PodcastEpisodeCard({ episode }: { episode: Episode }) {
  const publishedDate = episode.publishedAt
    ? new Date(episode.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const languageClassifications = episode.podcast.classifications?.filter(
    c => c.type === 'LANGUAGE'
  ) || [];

  return (
    <Card className="p-6 h-full flex flex-col hover:shadow-lg transition-shadow bg-white group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge color="purple" className="text-xs">
            {episode.podcast.title}
          </Badge>
          <Badge color="zinc" className="text-xs">
            Ep. {episode.episodeNumber}
          </Badge>
          {episode.audioClips.length > 0 && (
            <Badge color="green" className="text-xs flex items-center gap-1">
              <MusicalNoteIcon className="h-3 w-3" />
              Audio
            </Badge>
          )}
        </div>

        {languageClassifications.length > 0 && (
          <div className="flex gap-1">
            {languageClassifications.map(c => (
              <Badge key={c.id} color="zinc" className="text-xs">
                {c.name === 'English' ? 'EN' :
                 c.name === 'Afrikaans' ? 'AF' :
                 c.name === 'Xhosa' ? 'XH' : c.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1">
        <Link
          href={`/radio/podcasts/${episode.podcast.id}`}
          className="block group-hover:text-kelly-green transition-colors"
        >
          <Heading level={3} className="text-lg font-semibold text-zinc-900 mb-3 line-clamp-2">
            {episode.title}
          </Heading>
        </Link>

        {episode.description && (
          <Text className="text-zinc-600 text-sm line-clamp-3 mb-4">
            {episode.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
          </Text>
        )}
      </div>

      {episode.audioClips.length > 0 && (
        <div className="mb-4 p-3 bg-zinc-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MusicalNoteIcon className="h-4 w-4 text-kelly-green" />
            <Text className="text-sm font-medium text-zinc-700">
              Audio ({episode.audioClips.length} clip{episode.audioClips.length !== 1 ? 's' : ''})
            </Text>
          </div>
          <div className="space-y-2">
            {episode.audioClips.slice(0, 1).map(clip => (
              <CustomAudioPlayer
                key={clip.id}
                clip={clip}
                compact
                onError={() => toast.error('Failed to play audio file')}
              />
            ))}
            {episode.audioClips.length > 1 && (
              <Text className="text-xs text-zinc-500">
                +{episode.audioClips.length - 1} more audio clip{episode.audioClips.length - 1 !== 1 ? 's' : ''}
              </Text>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
        <div className="flex items-center gap-2">
          {episode.publisher && (
            <Text className="text-sm text-zinc-500">
              {episode.publisher.firstName} {episode.publisher.lastName}
            </Text>
          )}
        </div>

        {publishedDate && (
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4 text-zinc-400" />
            <Text className="text-sm text-zinc-500">{publishedDate}</Text>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100">
        <Link
          href={`/radio/podcasts/${episode.podcast.id}`}
          className="inline-flex items-center gap-2 text-kelly-green hover:text-kelly-green-dark text-sm font-medium transition-colors"
        >
          View Podcast
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </Card>
  );
}
