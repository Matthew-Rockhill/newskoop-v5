'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StoryCard } from '@/components/radio/StoryCard';
import {
  MegaphoneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function BulletinsPage() {
  const { data: session } = useSession();
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

  // Initialize language state with user's preference or fallback to English
  const defaultLanguage = profileData?.user?.defaultLanguagePreference || 'English';
  const [selectedLanguage, setSelectedLanguage] = useState<string>(defaultLanguage);

  // Update language state when user profile loads or changes
  useEffect(() => {
    if (profileData?.user?.defaultLanguagePreference) {
      setSelectedLanguage(profileData.user.defaultLanguagePreference);
    }
  }, [profileData?.user?.defaultLanguagePreference]);

  // Fetch bulletins (using stories API with news-bulletins category)
  const { data, isLoading, error } = useQuery({
    queryKey: ['radio-bulletins', currentPage, selectedLanguage],
    queryFn: async () => {
      const response = await fetch(
        `/api/radio/stories?category=news-bulletins&language=${selectedLanguage}&page=${currentPage}&perPage=20`
      );
      if (!response.ok) throw new Error('Failed to fetch bulletins');
      return response.json();
    },
    enabled: !!session,
  });

  const bulletins = data?.stories || [];
  const pagination = data?.pagination;
  const station = data?.station;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8">
          <Heading level={1} className="text-3xl font-bold text-gray-900">
            News Bulletins
          </Heading>
          <Text className="mt-2 text-gray-600">
            Browse our collection of news bulletins
          </Text>
        </div>

        {/* Language Filter */}
        {station?.allowedLanguages && station.allowedLanguages.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Text className="text-sm text-gray-600 self-center mr-2">Language:</Text>
            {station.allowedLanguages.map((lang: string) => (
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

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <Text className="text-red-800">
              {error instanceof Error ? error.message : 'Failed to load bulletins'}
            </Text>
          </div>
        )}

        {/* Bulletins List */}
        {!isLoading && !error && bulletins.length > 0 && (
          <>
            <div className="space-y-4 mb-8">
              {bulletins.map((bulletin: any) => (
                <Link
                  key={bulletin.id}
                  href={`/radio/story/${bulletin.id}`}
                  className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Heading level={3} className="text-xl font-semibold text-gray-900 group-hover:text-kelly-green transition-colors mb-2">
                        {bulletin.title}
                      </Heading>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {bulletin.publishedAt && (
                          <span>
                            {new Date(bulletin.publishedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                        {bulletin.author && (
                          <>
                            <span>•</span>
                            <span>{bulletin.author.firstName} {bulletin.author.lastName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <MegaphoneIcon className="h-8 w-8 text-kelly-green flex-shrink-0 ml-4" />
                  </div>

                  {/* Excerpt */}
                  {bulletin.excerpt && (
                    <Text className="text-gray-600 mb-3 line-clamp-2">
                      {bulletin.excerpt}
                    </Text>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {bulletin.category && (
                      <Badge color="blue" className="text-xs">
                        {bulletin.category.name}
                      </Badge>
                    )}
                    {bulletin.tags
                      ?.filter((t: any) => t.category === 'LANGUAGE')
                      .slice(0, 2)
                      .map((tag: any) => (
                        <Badge key={tag.id} color="zinc" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    {bulletin.audioClips && bulletin.audioClips.length > 0 && (
                      <Badge color="green" className="text-xs">
                        🎵 {bulletin.audioClips.length} Audio {bulletin.audioClips.length === 1 ? 'Clip' : 'Clips'}
                      </Badge>
                    )}
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
        {!isLoading && !error && bulletins.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MegaphoneIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <Heading level={3} className="text-xl font-semibold text-gray-900 mb-2">
              No bulletins available
            </Heading>
            <Text className="text-gray-600">
              {selectedLanguage !== 'English'
                ? `No bulletins available in ${selectedLanguage}. Try selecting a different language.`
                : 'Check back later for new bulletins.'}
            </Text>
          </div>
        )}
      </Container>
    </div>
  );
}
