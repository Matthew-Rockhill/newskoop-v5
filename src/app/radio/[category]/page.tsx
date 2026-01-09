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
import { StoryCard } from '@/components/radio/StoryCard';
import { 
  NewspaperIcon,
  FunnelIcon,
  ArrowLeftIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [currentPage, setCurrentPage] = useState(1);
  const categorySlug = params.category as string;

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

  // Fetch stories for this category
  const { data: storiesData, isLoading } = useQuery({
    queryKey: ['radio-category-stories', categorySlug, selectedLanguage, currentPage],
    queryFn: async () => {
      const response = await fetch(
        `/api/radio/stories?category=${categorySlug}&language=${selectedLanguage}&page=${currentPage}&perPage=12`
      );
      if (!response.ok) throw new Error('Failed to fetch stories');
      return response.json();
    },
    enabled: !!session && !!categorySlug,
  });

  const category = categoriesData?.categories.find((c: any) => c.slug === categorySlug);
  const stories = storiesData?.stories || [];
  const station = storiesData?.station;
  const pagination = storiesData?.pagination;

  // Function to get category icon
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'News Bulletins':
        return MegaphoneIcon;
      case 'News Stories':
        return NewspaperIcon;
      case 'Sports':
        return TrophyIcon;
      case 'Finance':
        return CurrencyDollarIcon;
      case 'Speciality':
        return SparklesIcon;
      default:
        return DocumentTextIcon;
    }
  };

  // Filter stories by selected language (client-side backup)
  const filteredStories = stories.filter((story: any) => {
    const languageTags = story.tags?.filter((tag: any) => tag.category === 'LANGUAGE') || [];
    return languageTags.some((tag: any) => tag.name === selectedLanguage);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Container className="py-8">
        {/* Back Navigation */}
        <div className="mb-8">
          <Button
            color="white"
            onClick={() => router.push('/radio')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Radio Station Zone
          </Button>
        </div>

        {/* Category Hero Card */}
        <Card className="mb-12 bg-white shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-kelly-green to-kelly-green-dark p-8">
            <div className="flex items-start justify-between">
              {/* Category Title with Icon */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {(() => {
                    const Icon = getCategoryIcon(category?.name || '');
                    return <Icon className="h-8 w-8 text-zinc-800" />;
                  })()}
                  <Heading level={1} className="text-3xl font-bold text-white">
                    {category?.name || 'Category'}
                  </Heading>
                </div>
                {category?.description && (
                  <Text className="text-lg text-white/90 max-w-2xl">
                    {category.description}
                  </Text>
                )}
              </div>

              {/* Count Badge */}
              <div className="flex-shrink-0">
                <Badge color="zinc" className="bg-zinc-50 text-zinc-800 font-semibold border border-zinc-200">
                  {pagination?.total || stories.length} {category?.name === 'News Bulletins' ? 'bulletins' : 'stories'}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Station Info Bar */}
          <div className="bg-zinc-50 px-8 py-4 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Text className="text-sm text-zinc-600">Languages Available:</Text>
                  <div className="flex gap-1">
                    {station?.allowedLanguages?.map((lang: string) => (
                      <Badge key={lang} color="blue" className="text-xs">
                        {lang === 'English' ? 'EN' : lang === 'Afrikaans' ? 'AF' : 'XH'}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Text className="text-sm text-zinc-600">Content Access:</Text>
                  <Badge color="green">Active</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4 text-zinc-500" />
                <Text className="text-sm text-zinc-600">
                  Last updated: {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* Stories Section Header */}
        <div className="flex justify-between items-center mb-6">
          <Heading level={2} className="text-2xl font-semibold text-zinc-900">
            {category?.name === 'News Bulletins' ? 'Latest News Bulletins' : `Stories in ${category?.name}`}
            <Badge color="blue" className="ml-3">
              {selectedLanguage}
            </Badge>
          </Heading>
          <div className="flex items-center gap-4">
            <Text className="text-zinc-500">
              {filteredStories.length} of {stories.length} {category?.name === 'News Bulletins' ? 'bulletins' : 'stories'}
            </Text>
            {/* Language Filter */}
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
                  No {category?.name === 'News Bulletins' ? 'bulletins' : 'stories'} available
                </Heading>
                <Text className="text-zinc-400 mb-4">
                  {selectedLanguage !== 'English' 
                    ? `No ${category?.name?.toLowerCase()} ${category?.name === 'News Bulletins' ? 'bulletins' : 'stories'} available in ${selectedLanguage}. Try switching languages.`
                    : `No ${category?.name?.toLowerCase()} ${category?.name === 'News Bulletins' ? 'bulletins' : 'stories'} available at the moment. Check back later.`
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