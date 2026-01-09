'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { DataList, type DataListColumn } from '@/components/ui/data-list';
import { PlayCircleIcon } from '@heroicons/react/24/outline';

interface Show {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  isActive: boolean;
  isPublished: boolean;
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
  _count: {
    episodes: number;
  };
}

interface ShowsResponse {
  shows: Show[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export default function ShowsPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Fetch shows
  const { data, isLoading, error } = useQuery<ShowsResponse>({
    queryKey: ['radio-shows', currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/radio/shows?page=${currentPage}&perPage=12`);
      if (!response.ok) throw new Error('Failed to fetch shows');
      return response.json();
    },
  });

  const shows = data?.shows || [];
  const pagination = data?.pagination;

  // Filter by language on client side
  const filteredShows = useMemo(() => {
    return selectedLanguage === 'all'
      ? shows
      : shows.filter(show =>
          show.tags.some(t =>
            t.tag.category === 'LANGUAGE' &&
            t.tag.name.toLowerCase() === selectedLanguage.toLowerCase()
          )
        );
  }, [shows, selectedLanguage]);

  const languages = ['English', 'Afrikaans', 'Xhosa'];

  // Define columns for the DataList
  const columns: DataListColumn<Show>[] = useMemo(() => [
    {
      key: 'show',
      header: 'Show',
      priority: 1,
      width: 'expand',
      render: (show) => (
        <div className="flex gap-6">
          {/* Cover Image */}
          <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100">
            {show.coverImageUrl ? (
              <img
                src={show.coverImageUrl}
                alt={show.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
                <PlayCircleIcon className="h-10 w-10 text-zinc-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <Heading level={3} className="text-xl font-semibold text-zinc-900 dark:text-white group-hover:text-kelly-green transition-colors">
                {show.title}
              </Heading>
              <Badge color="zinc" className="ml-4 flex-shrink-0">
                {show._count.episodes} {show._count.episodes === 1 ? 'Episode' : 'Episodes'}
              </Badge>
            </div>

            {/* Description */}
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
              {show.description || 'No description available'}
            </Text>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {show.category && (
                <Badge color="blue" className="text-xs">
                  {show.category.name}
                </Badge>
              )}
              {show.tags
                .filter(t => t.tag.category === 'LANGUAGE')
                .slice(0, 2)
                .map(({ tag }) => (
                  <Badge key={tag.id} color="zinc" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      ),
      mobileRender: (show) => (
        <div className="space-y-3">
          <div className="flex gap-4">
            {/* Cover Image */}
            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100">
              {show.coverImageUrl ? (
                <img
                  src={show.coverImageUrl}
                  alt={show.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
                  <PlayCircleIcon className="h-8 w-8 text-zinc-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-zinc-900 dark:text-white truncate">
                {show.title}
              </div>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {show.description || 'No description available'}
              </Text>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge color="zinc">
              {show._count.episodes} {show._count.episodes === 1 ? 'Episode' : 'Episodes'}
            </Badge>
            {show.category && (
              <Badge color="blue">{show.category.name}</Badge>
            )}
          </div>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-20">
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8">
          <Heading level={1} className="text-3xl font-bold text-zinc-900 dark:text-white">
            Shows & Podcasts
          </Heading>
          <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
            Browse our collection of shows and podcast episodes
          </Text>
        </div>

        {/* Language Filter */}
        <div
          role="group"
          aria-label="Filter shows by language"
          className="mb-6 flex flex-wrap gap-2"
        >
          <button
            onClick={() => setSelectedLanguage('all')}
            aria-pressed={selectedLanguage === 'all'}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              selectedLanguage === 'all'
                ? 'bg-kelly-green text-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 hover:border-kelly-green hover:text-kelly-green'
            }`}
          >
            All Languages
          </button>
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              aria-pressed={selectedLanguage === lang}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                selectedLanguage === lang
                  ? 'bg-kelly-green text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 hover:border-kelly-green hover:text-kelly-green'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <DataList<Show>
          items={filteredShows}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          variant="cards"
          columns={columns}
          onRowClick={(show) => router.push(`/radio/shows/${show.id}`)}
          getRowHref={(show) => `/radio/shows/${show.id}`}
          pagination={pagination ? {
            page: pagination.page,
            pageSize: 12,
            total: pagination.total,
            onPageChange: setCurrentPage,
          } : undefined}
          emptyState={{
            icon: PlayCircleIcon,
            title: "No shows available",
            description: selectedLanguage !== 'all'
              ? `No shows available in ${selectedLanguage}. Try selecting a different language.`
              : 'Check back later for new shows and podcast episodes.',
          }}
          ariaLabel="Shows and podcasts list"
        />
      </Container>
    </div>
  );
}
