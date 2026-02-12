'use client';

import { useState, useEffect } from 'react';
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
  SpeakerWaveIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';

export default function RadioDashboard() {
  const { data: session } = useSession();

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

  // Initialize language states with user's preference or fallback to English
  const defaultLanguage = profileData?.user?.defaultLanguagePreference || 'English';
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [selectedBulletinLanguage, setSelectedBulletinLanguage] = useState(defaultLanguage);
  const [selectedEpisodeLanguage, setSelectedEpisodeLanguage] = useState(defaultLanguage);

  // Update language states when user profile loads or changes
  useEffect(() => {
    if (profileData?.user?.defaultLanguagePreference) {
      const userLanguage = profileData.user.defaultLanguagePreference;
      setSelectedLanguage(userLanguage);
      setSelectedBulletinLanguage(userLanguage);
      setSelectedEpisodeLanguage(userLanguage);
    }
  }, [profileData?.user?.defaultLanguagePreference]);

  // Fetch recent stories
  const { data: storiesData, isLoading } = useQuery({
    queryKey: ['radio-stories'],
    queryFn: async () => {
      const response = await fetch('/api/radio/stories?perPage=12');
      if (!response.ok) throw new Error('Failed to fetch stories');
      return response.json();
    },
    enabled: !!session,
  });

  // Fetch today's bulletins
  const { data: bulletinsData, isLoading: bulletinsLoading } = useQuery({
    queryKey: ['radio-bulletins'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/radio/stories?category=news-bulletins&publishedAfter=${today}&perPage=10`);
      if (!response.ok) throw new Error('Failed to fetch bulletins');
      return response.json();
    },
    enabled: !!session,
  });

  // Fetch shows for the shows section
  const { data: showsData, isLoading: showsLoading } = useQuery({
    queryKey: ['radio-shows-home'],
    queryFn: async () => {
      const response = await fetch(`/api/radio/shows?perPage=6`);
      if (!response.ok) throw new Error('Failed to fetch shows');
      return response.json();
    },
    enabled: !!session,
  });

  const stories = storiesData?.stories || [];
  const station = storiesData?.station;
  const bulletins = bulletinsData?.stories || [];
  const shows = showsData?.shows || [];

  // Filter stories by selected language
  const filteredStories = stories.filter((story: any) => {
    if (!selectedLanguage) return true;
    const languageTags = story.tags?.filter((tag: any) => tag.category === 'LANGUAGE') || [];
    return languageTags.some((tag: any) => tag.name === selectedLanguage);
  });

  // Filter bulletins by selected language
  const filteredBulletins = bulletins.filter((bulletin: any) => {
    if (!selectedBulletinLanguage) return true;
    const languageTags = bulletin.tags?.filter((tag: any) => tag.category === 'LANGUAGE') || [];
    return languageTags.some((tag: any) => tag.name === selectedBulletinLanguage);
  });

  // Filter shows by selected language
  const filteredShows = shows.filter((show: any) => {
    if (!selectedEpisodeLanguage) return true;
    const languageTags = show.tags?.map((st: any) => st.tag).filter((tag: any) => tag.category === 'LANGUAGE') || [];
    return languageTags.some((tag: any) => tag.name === selectedEpisodeLanguage);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Container className="pt-12 pb-8">
        {/* Welcome */}
        <div className="mb-8">
          <PageHeader
            title={`Welcome back, ${session?.user?.firstName || ''}`}
            description={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          />
        </div>

        {/* Today's Bulletins */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <Heading level={2} className="text-2xl font-semibold text-zinc-900">
              Today's Bulletins
              <Badge color="blue" className="ml-3">
                {selectedBulletinLanguage}
              </Badge>
            </Heading>
            <div className="flex items-center gap-4">
              <Text className="text-zinc-500">
                {filteredBulletins.length} of {bulletins.length} bulletins
              </Text>
              {/* Language Filter */}
              <div className="flex items-center gap-2">
                <Text className="text-sm text-zinc-600">Language:</Text>
                <div className="flex gap-1">
                  {station?.allowedLanguages?.map((language: string) => (
                    <button
                      key={language}
                      onClick={() => setSelectedBulletinLanguage(language)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedBulletinLanguage === language
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
              <Button
                color="white"
                onClick={() => window.location.href = '/radio/news-bulletins'}
                className="flex items-center gap-2"
              >
                View All
              </Button>
            </div>
          </div>

          {bulletinsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse bg-white">
                  <div className="h-4 bg-zinc-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-zinc-200 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-zinc-200 rounded mb-4"></div>
                  <div className="h-3 bg-zinc-200 rounded w-1/4"></div>
                </Card>
              ))}
            </div>
          ) : filteredBulletins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBulletins.slice(0, 6).map((bulletin: any) => (
                <StoryCard
                  key={bulletin.id}
                  story={bulletin}
                  selectedLanguage={selectedBulletinLanguage}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center bg-white">
              <MegaphoneIcon className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
              <Heading level={3} className="text-zinc-500 mb-2">
                No bulletins available in {selectedBulletinLanguage} today
              </Heading>
              <Text className="text-zinc-400">
                Check back later or try a different language.
              </Text>
            </Card>
          )}
        </div>

        {/* Recent Stories */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <Heading level={2} className="text-2xl font-semibold text-zinc-900">
              Latest Stories
              <Badge color="blue" className="ml-3">
                {selectedLanguage}
              </Badge>
            </Heading>
            <div className="flex items-center gap-4">
              <Text className="text-zinc-500">
                {filteredStories.length} of {stories.length} stories
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
              <Button
                color="white"
                onClick={() => window.location.href = '/radio/news-stories'}
                className="flex items-center gap-2"
              >
                View All
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse bg-white">
                  <div className="h-4 bg-zinc-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-zinc-200 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-zinc-200 rounded mb-4"></div>
                  <div className="h-3 bg-zinc-200 rounded w-1/4"></div>
                </Card>
              ))}
            </div>
          ) : filteredStories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredStories.slice(0, 6).map((story: any) => (
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
                No stories available in {selectedLanguage}
              </Heading>
              <Text className="text-zinc-400">
                Try switching to a different language or check back later.
              </Text>
            </Card>
          )}
        </div>

        {/* Latest Shows */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <Heading level={2} className="text-2xl font-semibold text-zinc-900">
              Latest Shows
              <Badge color="blue" className="ml-3">
                {selectedEpisodeLanguage}
              </Badge>
            </Heading>
            <div className="flex items-center gap-4">
              <Text className="text-zinc-500">
                {filteredShows.length} of {shows.length} shows
              </Text>
              {/* Language Filter */}
              <div className="flex items-center gap-2">
                <Text className="text-sm text-zinc-600">Language:</Text>
                <div className="flex gap-1">
                  {station?.allowedLanguages?.map((language: string) => (
                    <button
                      key={language}
                      onClick={() => setSelectedEpisodeLanguage(language)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedEpisodeLanguage === language
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
              <Button
                color="white"
                onClick={() => window.location.href = '/radio/shows'}
                className="flex items-center gap-2"
              >
                View All
              </Button>
            </div>
          </div>

          {showsLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse bg-white">
                  <div className="flex gap-6">
                    <div className="w-32 h-32 bg-zinc-200 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-zinc-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-zinc-200 rounded w-1/2 mb-4"></div>
                      <div className="h-3 bg-zinc-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredShows.length > 0 ? (
            <div className="space-y-4">
              {filteredShows.slice(0, 6).map((show: any) => (
                <Link
                  key={show.id}
                  href={`/radio/shows/${show.slug}`}
                  className="flex gap-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 group"
                >
                  {/* Show Cover Image */}
                  <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100">
                    {show.coverImageUrl ? (
                      <img
                        src={show.coverImageUrl}
                        alt={show.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-kelly-green to-kelly-green-dark">
                        <SpeakerWaveIcon className="h-12 w-12 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Show Details */}
                  <div className="flex-1 min-w-0">
                    <Heading level={3} className="text-xl font-semibold text-zinc-900 group-hover:text-kelly-green transition-colors mb-2">
                      {show.title}
                    </Heading>
                    {show.description && (
                      <Text className="text-zinc-600 mb-3 line-clamp-2">
                        {show.description}
                      </Text>
                    )}
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                      <Badge color="blue" className="text-xs">
                        {show._count?.episodes || 0} Episodes
                      </Badge>
                      {show.tags?.map((st: any) => st.tag).filter((tag: any) => tag.category === 'LANGUAGE').slice(0, 2).map((tag: any) => (
                        <Badge key={tag.id} color="zinc" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center bg-white">
              <SpeakerWaveIcon className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
              <Heading level={3} className="text-zinc-500 mb-2">
                No shows available in {selectedEpisodeLanguage}
              </Heading>
              <Text className="text-zinc-400">
                Try switching to a different language or check back later.
              </Text>
            </Card>
          )}
        </div>
      </Container>
    </div>
  );
}
