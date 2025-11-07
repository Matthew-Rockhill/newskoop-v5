'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PlayCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

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
  const filteredShows = selectedLanguage === 'all'
    ? shows
    : shows.filter(show =>
        show.tags.some(t =>
          t.tag.category === 'LANGUAGE' &&
          t.tag.name.toLowerCase() === selectedLanguage.toLowerCase()
        )
      );

  const languages = ['English', 'Afrikaans', 'Xhosa'];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8">
          <Heading level={1} className="text-3xl font-bold text-gray-900">
            Shows & Podcasts
          </Heading>
          <Text className="mt-2 text-gray-600">
            Browse our collection of shows and podcast episodes
          </Text>
        </div>

        {/* Language Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            onClick={() => setSelectedLanguage('all')}
            color={selectedLanguage === 'all' ? 'primary' : 'white'}
            className="text-sm"
          >
            All Languages
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

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                <div className="bg-gray-200 h-48 rounded-lg mb-4" />
                <div className="h-6 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <Text className="text-red-800">
              {error instanceof Error ? error.message : 'Failed to load shows'}
            </Text>
          </div>
        )}

        {/* Shows List */}
        {!isLoading && !error && filteredShows.length > 0 && (
          <>
            <div className="space-y-4">
              {filteredShows.map((show) => (
                <Link
                  key={show.id}
                  href={`/radio/shows/${show.id}`}
                  className="flex gap-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 group"
                >
                  {/* Cover Image */}
                  <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    {show.coverImageUrl ? (
                      <img
                        src={show.coverImageUrl}
                        alt={show.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <Heading level={3} className="text-xl font-semibold text-gray-900 group-hover:text-kelly-green transition-colors">
                        {show.title}
                      </Heading>
                      <Badge color="zinc" className="ml-4 flex-shrink-0">
                        {show._count.episodes} {show._count.episodes === 1 ? 'Episode' : 'Episodes'}
                      </Badge>
                    </div>

                    {/* Description */}
                    <Text className="text-sm text-gray-600 line-clamp-2 mb-3">
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
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  outline
                  className="flex items-center gap-1"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                    if (!showPage) {
                      // Show ellipsis
                      if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                      }
                      return null;
                    }

                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        color={currentPage === pageNum ? 'primary' : 'white'}
                        className="min-w-[2.5rem]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={currentPage === pagination.totalPages}
                  outline
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredShows.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <PlayCircleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <Heading level={3} className="text-xl font-semibold text-gray-900 mb-2">
              No shows available
            </Heading>
            <Text className="text-gray-600">
              {selectedLanguage !== 'all'
                ? `No shows available in ${selectedLanguage}. Try selecting a different language.`
                : 'Check back later for new shows and podcast episodes.'}
            </Text>
          </div>
        )}
      </Container>
    </div>
  );
}
