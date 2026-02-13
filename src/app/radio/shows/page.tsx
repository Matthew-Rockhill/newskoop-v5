'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { DataList, type DataListColumn } from '@/components/ui/data-list';
import { PageHeader } from '@/components/ui/page-header';
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
    id: string;
    name: string;
  }>;
  classifications: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  subShows?: Array<{
    id: string;
    title: string;
    description?: string;
    _count: { episodes: number };
  }>;
  _count: {
    episodes: number;
    subShows?: number;
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
  station?: {
    name: string;
    allowedLanguages: string[];
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

  const station = data?.station;

  // Filter by language on client side
  const filteredShows = useMemo(() => {
    return selectedLanguage === 'all'
      ? shows
      : shows.filter(show =>
          show.classifications?.some(c =>
            c.type === 'LANGUAGE' &&
            c.name.toLowerCase() === selectedLanguage.toLowerCase()
          )
        );
  }, [shows, selectedLanguage]);

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
              <Heading level={3} className="text-xl font-semibold text-zinc-900 group-hover:text-kelly-green transition-colors">
                {show.title}
              </Heading>
              <div className="ml-4 flex-shrink-0 flex gap-2">
                <Badge color="zinc">
                  {show._count.episodes} {show._count.episodes === 1 ? 'Episode' : 'Episodes'}
                </Badge>
                {(show._count.subShows ?? 0) > 0 && (
                  <Badge color="blue">
                    {show._count.subShows} Sub-Shows
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <Text className="text-sm text-zinc-600 line-clamp-2 mb-3">
              {show.description || 'No description available'}
            </Text>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {show.category && (
                <Badge color="blue" className="text-xs">
                  {show.category.name}
                </Badge>
              )}
              {show.classifications
                ?.filter(c => c.type === 'LANGUAGE')
                .slice(0, 2)
                .map((c) => (
                  <Badge key={c.id} color="zinc" className="text-xs">
                    {c.name}
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
              <div className="font-semibold text-zinc-900 truncate">
                {show.title}
              </div>
              <Text className="text-sm text-zinc-600 line-clamp-2">
                {show.description || 'No description available'}
              </Text>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge color="zinc">
              {show._count.episodes} {show._count.episodes === 1 ? 'Episode' : 'Episodes'}
            </Badge>
            {(show._count.subShows ?? 0) > 0 && (
              <Badge color="blue">
                {show._count.subShows} Sub-Shows
              </Badge>
            )}
            {show.category && (
              <Badge color="blue">{show.category.name}</Badge>
            )}
          </div>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Container className="pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <PageHeader
            title="Shows & Podcasts"
            description="Browse our collection of shows and podcast episodes"
            actions={
              <div className="flex items-center gap-2">
                <Text className="text-sm text-zinc-600">Language:</Text>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedLanguage('all')}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedLanguage === 'all'
                        ? 'bg-kelly-green text-white border-kelly-green'
                        : 'bg-white text-zinc-600 border-zinc-300 hover:border-kelly-green hover:text-kelly-green'
                    }`}
                  >
                    All
                  </button>
                  {(station?.allowedLanguages || ['English', 'Afrikaans', 'Xhosa']).map((lang: string) => (
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
