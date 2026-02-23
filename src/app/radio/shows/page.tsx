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

interface Show {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  category?: { id: string; name: string; slug: string };
  classifications: Array<{ id: string; name: string; type: string }>;
  subShows?: Array<{
    id: string;
    title: string;
    _count: { episodes: number };
  }>;
  _count: { episodes: number; subShows?: number };
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
  show: {
    id: string;
    title: string;
    slug: string;
    coverImage?: string | null;
    parentId?: string | null;
    parent?: { id: string; title: string } | null;
    classifications: Array<{ id: string; name: string; type: string }>;
  };
  audioClips: AudioClip[];
  publisher?: { id: string; firstName: string; lastName: string } | null;
}

export default function ShowsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [selectedShow, setSelectedShow] = useState<string | null>(
    searchParams.get('showId')
  );
  const [selectedSubShow, setSelectedSubShow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch user profile to get default language preference
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

  // Fetch shows list for tabs
  const { data: showsData } = useQuery({
    queryKey: ['radio-shows-list'],
    queryFn: async () => {
      const response = await fetch('/api/radio/shows?perPage=100');
      if (!response.ok) throw new Error('Failed to fetch shows');
      return response.json();
    },
    enabled: !!session,
  });

  const shows: Show[] = showsData?.shows || [];
  const station = showsData?.station;

  // Determine which show ID to use for episodes API
  const effectiveShowId = selectedSubShow || selectedShow;

  // Fetch episodes
  const { data: episodesData, isLoading } = useQuery({
    queryKey: ['radio-show-episodes', effectiveShowId, selectedLanguage, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        perPage: '12',
      });
      if (effectiveShowId) params.set('showId', effectiveShowId);
      if (selectedLanguage) params.set('language', selectedLanguage);

      const response = await fetch(`/api/radio/shows/episodes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch episodes');
      return response.json();
    },
    enabled: !!session,
  });

  const episodes: Episode[] = episodesData?.episodes || [];
  const pagination = episodesData?.pagination;

  // If station data comes from episodes endpoint, use it as fallback
  const stationData = station || episodesData?.station;

  // Get sub-shows of the selected parent show
  const selectedShowData = selectedShow
    ? shows.find(s => s.id === selectedShow)
    : null;
  const subShows = selectedShowData?.subShows || [];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedShow, selectedSubShow, selectedLanguage]);

  // Reset sub-show when parent show changes
  useEffect(() => {
    setSelectedSubShow(null);
  }, [selectedShow]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Container className="pt-24 pb-8">
        {/* Page Header with language filter */}
        <div className="mb-8">
          <PageHeader
            title="Speciality"
            description="Browse episodes from our shows and podcasts"
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

        {/* Show Tabs */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2 pb-2" role="tablist" aria-label="Filter by show">
            <button
              role="tab"
              aria-selected={!selectedShow}
              onClick={() => setSelectedShow(null)}
              className={`px-4 py-2 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
                !selectedShow
                  ? 'bg-kelly-green text-white border-kelly-green'
                  : 'bg-white text-zinc-600 border-zinc-300 hover:border-kelly-green hover:text-kelly-green'
              }`}
            >
              All
            </button>
            {shows.map(show => (
              <button
                key={show.id}
                role="tab"
                aria-selected={selectedShow === show.id}
                onClick={() => setSelectedShow(show.id)}
                className={`px-4 py-2 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
                  selectedShow === show.id
                    ? 'bg-kelly-green text-white border-kelly-green'
                    : 'bg-white text-zinc-600 border-zinc-300 hover:border-kelly-green hover:text-kelly-green'
                }`}
              >
                {show.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Show Tabs (if parent show has sub-shows) */}
        {selectedShow && subShows.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 pb-2" role="tablist" aria-label="Filter by sub-show">
              <button
                role="tab"
                aria-selected={!selectedSubShow}
                onClick={() => setSelectedSubShow(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-colors ${
                  !selectedSubShow
                    ? 'bg-zinc-800 text-white border-zinc-800'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700'
                }`}
              >
                All {selectedShowData?.title}
              </button>
              {subShows.map(sub => (
                <button
                  key={sub.id}
                  role="tab"
                  aria-selected={selectedSubShow === sub.id}
                  onClick={() => setSelectedSubShow(sub.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-colors ${
                    selectedSubShow === sub.id
                      ? 'bg-zinc-800 text-white border-zinc-800'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  {sub.title}
                </button>
              ))}
            </div>
          </div>
        )}

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
            {/* Episodes Grid */}
            {episodes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {episodes.map(episode => (
                  <EpisodeCard key={episode.id} episode={episode} />
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
                    : selectedShow
                    ? 'No episodes available for this show. Try selecting a different show.'
                    : 'Check back later for new episodes.'
                  }
                </Text>
                {selectedLanguage !== 'English' && (
                  <Button
                    color="white"
                    onClick={() => setSelectedLanguage('English')}
                  >
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

// Episode Card component
function EpisodeCard({ episode }: { episode: Episode }) {
  const publishedDate = episode.publishedAt
    ? new Date(episode.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const languageClassifications = episode.show.classifications?.filter(
    c => c.type === 'LANGUAGE'
  ) || [];

  return (
    <Card className="p-6 h-full flex flex-col hover:shadow-lg transition-shadow bg-white group">
      {/* Header with Show name and Languages */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge color="blue" className="text-xs">
            {episode.show.parent
              ? `${episode.show.parent.title} / ${episode.show.title}`
              : episode.show.title}
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

      {/* Episode Title and Description */}
      <div className="flex-1">
        <Link
          href={`/radio/shows/${episode.show.id}`}
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

      {/* Audio Section */}
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

      {/* Footer with Publisher and Date */}
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

      {/* View in Show link */}
      <div className="mt-4 pt-3 border-t border-zinc-100">
        <Link
          href={`/radio/shows/${episode.show.id}`}
          className="inline-flex items-center gap-2 text-kelly-green hover:text-kelly-green-dark text-sm font-medium transition-colors"
        >
          View in Show
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </Card>
  );
}
