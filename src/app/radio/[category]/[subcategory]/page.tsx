'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StoryCard } from '@/components/radio/StoryCard';
import {
  NewspaperIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function SubCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [currentPage, setCurrentPage] = useState(1);
  const categorySlug = params.category as string;
  const subCategorySlug = params.subcategory as string;

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

  // Fetch category info
  const { data: categoriesData } = useQuery({
    queryKey: ['radio-categories'],
    queryFn: async () => {
      const response = await fetch('/api/radio/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    enabled: !!session,
  });

  // Fetch stories for this sub-category
  const { data: storiesData, isLoading } = useQuery({
    queryKey: ['radio-subcategory-stories', categorySlug, subCategorySlug, selectedLanguage, currentPage],
    queryFn: async () => {
      const response = await fetch(
        `/api/radio/stories?category=${categorySlug}&subCategory=${subCategorySlug}&language=${selectedLanguage}&page=${currentPage}&perPage=12`
      );
      if (!response.ok) throw new Error('Failed to fetch stories');
      return response.json();
    },
    enabled: !!session && !!categorySlug && !!subCategorySlug,
  });

  const category = categoriesData?.categories.find((c: any) => c.slug === categorySlug);
  const subCategory = category?.children?.find((sc: any) => sc.slug === subCategorySlug);
  const stories = storiesData?.stories || [];
  const station = storiesData?.station;
  const pagination = storiesData?.pagination;

  // Filter stories by selected language (client-side backup, uses classifications)
  const filteredStories = stories.filter((story: any) => {
    const langs = story.classifications?.filter((c: any) => c.type === 'LANGUAGE') || [];
    return langs.some((c: any) => c.name === selectedLanguage);
  });

  if (!category && categoriesData) {
    return (
      <Container className="py-12">
        <div className="text-center">
          <NewspaperIcon className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
          <Heading level={2} className="text-zinc-500 mb-2">Category Not Found</Heading>
          <Text className="text-zinc-400 mb-6">
            The category "{categorySlug}" doesn't exist or isn't available to your station.
          </Text>
          <Button color="primary" onClick={() => router.push('/radio')}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Radio Station Zone
          </Button>
        </div>
      </Container>
    );
  }

  if (!subCategory && categoriesData) {
    return (
      <Container className="py-12">
        <div className="text-center">
          <NewspaperIcon className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
          <Heading level={2} className="text-zinc-500 mb-2">Sub-Category Not Found</Heading>
          <Text className="text-zinc-400 mb-6">
            The sub-category "{subCategorySlug}" doesn't exist under {category?.name}.
          </Text>
          <Button color="primary" onClick={() => router.push(`/radio/${categorySlug}`)}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to {category?.name}
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Container className="pt-24 pb-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-600">
          <Link href="/radio" className="hover:text-kelly-green transition-colors">
            Home
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link href={`/radio/${categorySlug}`} className="hover:text-kelly-green transition-colors">
            {category?.name}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-zinc-900 font-medium">{subCategory?.name}</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <PageHeader
            title={subCategory?.name || 'Sub-Category'}
            description={`${category?.name} — ${subCategory?.name}`}
            actions={
              <div className="flex items-center gap-4">
                <Text className="text-zinc-500">
                  {filteredStories.length} of {stories.length} stories
                </Text>
                <div className="flex items-center gap-2">
                  <Text className="text-sm text-zinc-600">Language:</Text>
                  <div className="flex gap-1">
                    {station?.allowedLanguages?.map((language: string) => (
                      <button
                        key={language}
                        onClick={() => setSelectedLanguage(language)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          selectedLanguage === language
                            ? 'bg-kelly-green text-white border-kelly-green'
                            : 'bg-white text-zinc-600 border-zinc-300 hover:border-kelly-green hover:text-kelly-green'
                        }`}
                      >
                        {language === 'English' ? 'EN' :
                         language === 'Afrikaans' ? 'AF' :
                         language === 'Xhosa' ? 'XH' : language}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            }
          />
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
            {/* Stories Grid */}
            {filteredStories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredStories.map((story: any) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    selectedLanguage={selectedLanguage}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center bg-white">
                <NewspaperIcon className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
                <Heading level={3} className="text-zinc-500 mb-2">
                  No stories available
                </Heading>
                <Text className="text-zinc-400 mb-4">
                  {selectedLanguage !== 'English'
                    ? `No stories available in ${subCategory?.name} for ${selectedLanguage}. Try switching languages.`
                    : `No stories available in ${subCategory?.name} at the moment. Check back later.`
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
                        color={pageNumber === currentPage ? "primary" : "white"}
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
