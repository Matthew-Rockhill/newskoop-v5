'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { StoryCard } from '@/components/radio/StoryCard';
import { 
  NewspaperIcon, 
  SpeakerWaveIcon,
  ClockIcon,
  BuildingOfficeIcon,
  UserIcon,
  MegaphoneIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

export default function RadioDashboard() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

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

  // Fetch categories for quick navigation
  const { data: categoriesData } = useQuery({
    queryKey: ['radio-categories'],
    queryFn: async () => {
      const response = await fetch('/api/radio/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
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

  // Fetch latest show episodes (from Speciality category or similar)
  const { data: episodesData, isLoading: episodesLoading } = useQuery({
    queryKey: ['radio-episodes'],
    queryFn: async () => {
      const response = await fetch(`/api/radio/stories?category=speciality&perPage=12`);
      if (!response.ok) throw new Error('Failed to fetch episodes');
      return response.json();
    },
    enabled: !!session,
  });

  const stories = storiesData?.stories || [];
  const station = storiesData?.station;
  const categories = categoriesData?.categories || [];
  const bulletins = bulletinsData?.stories || [];
  const episodes = episodesData?.stories || [];

  // Fetch announcements
  const { data: announcementsData } = useQuery({
    queryKey: ['radio-announcements'],
    queryFn: async () => {
      const response = await fetch('/api/radio/announcements?perPage=10');
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return response.json();
    },
    enabled: !!session,
  });

  const announcements = announcementsData?.announcements || [];

  // Dismiss announcement mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/radio/announcements/${id}/dismiss`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to dismiss announcement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio-announcements'] });
    },
  });

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

  // Filter episodes by selected language
  const filteredEpisodes = episodes.filter((episode: any) => {
    if (!selectedEpisodeLanguage) return true;
    const languageTags = episode.tags?.filter((tag: any) => tag.category === 'LANGUAGE') || [];
    return languageTags.some((tag: any) => tag.name === selectedEpisodeLanguage);
  });

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

  // Handle announcement dismissal
  const handleDismissAnnouncement = async (id: string) => {
    try {
      await dismissMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error dismissing announcement:', error);
      alert('Failed to dismiss announcement');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Container className="py-8">
        {/* Welcome Section */}
        <Card className="mb-12 bg-white shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-kelly-green to-kelly-green-dark p-8">
            <div className="flex items-start gap-8">
              {/* Station Logo Placeholder */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center">
                  {station?.logoUrl ? (
                    <img 
                      src={station.logoUrl} 
                      alt={`${station.name} logo`}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <BuildingOfficeIcon className="h-12 w-12 text-kelly-green" />
                  )}
                </div>
              </div>
              
              {/* Welcome Message */}
              <div className="flex-1 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar 
                    name={session?.user?.firstName + ' ' + session?.user?.lastName}
                    className="size-8"
                  />
                  <Text className="text-white/90">
                    Welcome back, {session?.user?.firstName}!
                  </Text>
                </div>
                <Heading level={1} className="text-3xl font-bold text-white mb-3">
                  {station?.name || 'Your Radio Station'}
                </Heading>
                <Text className="text-lg text-white/90 max-w-2xl">
                  Access the latest news stories, bulletins, and specialty content curated for your station. 
                  Fresh content is available daily across all categories.
                </Text>
              </div>
            </div>
          </div>
          
          {/* Station Info Bar */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Text className="text-sm text-gray-600">Station:</Text>
                  <Badge color="green">{station?.name}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Text className="text-sm text-gray-600">Languages:</Text>
                  <div className="flex gap-1">
                    {station?.allowedLanguages?.map((lang: string) => (
                      <Badge key={lang} color="blue" className="text-xs">
                        {lang === 'English' ? 'EN' : lang === 'Afrikaans' ? 'AF' : 'XH'}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Text className="text-sm text-gray-600">Content Access:</Text>
                  <Badge color="green">Active</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-gray-500" />
                <Text className="text-sm text-gray-600">
                  Last updated: {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* Announcements Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <MegaphoneIcon className="h-7 w-7 text-kelly-green" />
            <Heading level={2} className="text-2xl font-semibold text-gray-900">
              Announcements
            </Heading>
            <Badge color="red" className="text-xs">
              {announcements.filter((a: any) => a.priority === 'HIGH').length} High Priority
            </Badge>
          </div>
          
          {announcements.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {announcements.map((announcement: any) => {
                const getPriorityIcon = () => {
                  switch (announcement.priority) {
                    case 'HIGH':
                      return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
                    case 'MEDIUM':
                      return <InformationCircleIcon className="h-5 w-5 text-amber-500" />;
                    default:
                      return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
                  }
                };

                const getRoleBadgeColor = () => {
                  switch (announcement.author.staffRole) {
                    case 'ADMIN':
                    case 'SUPERADMIN':
                      return 'red';
                    case 'EDITOR':
                      return 'purple';
                    default:
                      return 'blue';
                  }
                };

                const timeAgo = (dateString: string) => {
                  const date = new Date(dateString);
                  const diff = Date.now() - date.getTime();
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  if (days === 0) return 'Today';
                  if (days === 1) return 'Yesterday';
                  if (days < 7) return `${days} days ago`;
                  return date.toLocaleDateString();
                };

                return (
                  <Card 
                    key={announcement.id} 
                    className={`p-5 bg-white hover:shadow-lg transition-shadow relative ${
                      announcement.priority === 'HIGH' ? 'border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    {/* Dismiss button */}
                    <button
                      onClick={() => handleDismissAnnouncement(announcement.id)}
                      disabled={dismissMutation.isPending}
                      className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      title="Dismiss announcement"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>

                    <div className="flex items-start gap-2 mb-3 pr-8">
                      {getPriorityIcon()}
                      <Heading level={4} className="text-lg font-semibold text-gray-900">
                        {announcement.title}
                      </Heading>
                    </div>
                    
                    <Text className="text-gray-600 mb-4 line-clamp-2">
                      {announcement.message}
                    </Text>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <Text className="text-sm text-gray-500">
                          {announcement.author.firstName} {announcement.author.lastName}
                        </Text>
                        <Badge color={getRoleBadgeColor()} className="text-xs">
                          {announcement.author.staffRole}
                        </Badge>
                      </div>
                      <Text className="text-xs text-gray-500">
                        {timeAgo(announcement.createdAt)}
                      </Text>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center bg-white">
              <MegaphoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <Heading level={3} className="text-gray-500 mb-2">
                No new announcements
              </Heading>
              <Text className="text-gray-400">
                You're all caught up! Check back later for important updates.
              </Text>
            </Card>
          )}
        </div>

        {/* Category Quick Access */}
        {categories.length > 0 && (
          <div className="mb-12">
            <Heading level={2} className="text-2xl font-semibold text-gray-900 mb-6">
              Browse by Category
            </Heading>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((category: any) => {
                const Icon = getCategoryIcon(category.name);
                return (
                  <Card 
                    key={category.id}
                    className="p-4 text-center hover:shadow-lg transition-shadow cursor-pointer group bg-white"
                    onClick={() => window.location.href = `/radio/${category.slug}`}
                  >
                    <Icon className="h-8 w-8 text-kelly-green mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <div className="text-lg font-medium text-gray-900 group-hover:text-kelly-green transition-colors">
                      {category.name}
                    </div>
                    <Text className="text-sm text-gray-500 mt-1">
                      {category.storyCount || 0} stories
                    </Text>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Today's Bulletins */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <Heading level={2} className="text-2xl font-semibold text-gray-900">
              Today's Bulletins
              <Badge color="blue" className="ml-3">
                {selectedBulletinLanguage}
              </Badge>
            </Heading>
            <div className="flex items-center gap-4">
              <Text className="text-gray-500">
                {filteredBulletins.length} of {bulletins.length} bulletins
              </Text>
              {/* Language Filter */}
              <div className="flex items-center gap-2">
                <Text className="text-sm text-gray-600">Language:</Text>
                <div className="flex gap-1">
                  {station?.allowedLanguages?.map((language: string) => (
                    <button
                      key={language}
                      onClick={() => setSelectedBulletinLanguage(language)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedBulletinLanguage === language
                          ? 'bg-kelly-green text-white border-kelly-green'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-kelly-green hover:text-kelly-green'
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
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
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
              <MegaphoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <Heading level={3} className="text-gray-500 mb-2">
                No bulletins available in {selectedBulletinLanguage} today
              </Heading>
              <Text className="text-gray-400">
                Check back later or try a different language.
              </Text>
            </Card>
          )}
        </div>

        {/* Recent Stories */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <Heading level={2} className="text-2xl font-semibold text-gray-900">
              Latest Stories
              <Badge color="blue" className="ml-3">
                {selectedLanguage}
              </Badge>
            </Heading>
            <div className="flex items-center gap-4">
              <Text className="text-gray-500">
                {filteredStories.length} of {stories.length} stories
              </Text>
              {/* Language Filter */}
              <div className="flex items-center gap-2">
                <Text className="text-sm text-gray-600">Language:</Text>
                <div className="flex gap-1">
                  {station?.allowedLanguages?.map((language: string) => (
                    <button
                      key={language}
                      onClick={() => setSelectedLanguage(language)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedLanguage === language
                          ? 'bg-kelly-green text-white border-kelly-green'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-kelly-green hover:text-kelly-green'
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse bg-white">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </Card>
              ))}
            </div>
          ) : filteredStories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <NewspaperIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <Heading level={3} className="text-gray-500 mb-2">
                No stories available in {selectedLanguage}
              </Heading>
              <Text className="text-gray-400">
                Try switching to a different language or check back later.
              </Text>
            </Card>
          )}
        </div>

        {/* Latest Show Episodes */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <Heading level={2} className="text-2xl font-semibold text-gray-900">
              Latest Show Episodes
              <Badge color="blue" className="ml-3">
                {selectedEpisodeLanguage}
              </Badge>
            </Heading>
            <div className="flex items-center gap-4">
              <Text className="text-gray-500">
                {filteredEpisodes.length} of {episodes.length} episodes
              </Text>
              {/* Language Filter */}
              <div className="flex items-center gap-2">
                <Text className="text-sm text-gray-600">Language:</Text>
                <div className="flex gap-1">
                  {station?.allowedLanguages?.map((language: string) => (
                    <button
                      key={language}
                      onClick={() => setSelectedEpisodeLanguage(language)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedEpisodeLanguage === language
                          ? 'bg-kelly-green text-white border-kelly-green'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-kelly-green hover:text-kelly-green'
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
                onClick={() => window.location.href = '/radio/speciality'}
                className="flex items-center gap-2"
              >
                View All
              </Button>
            </div>
          </div>

          {episodesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse bg-white">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </Card>
              ))}
            </div>
          ) : filteredEpisodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEpisodes.slice(0, 6).map((episode: any) => (
                <StoryCard 
                  key={episode.id} 
                  story={episode}
                  selectedLanguage={selectedEpisodeLanguage}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center bg-white">
              <SpeakerWaveIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <Heading level={3} className="text-gray-500 mb-2">
                No episodes available in {selectedEpisodeLanguage}
              </Heading>
              <Text className="text-gray-400">
                Try switching to a different language or check back later.
              </Text>
            </Card>
          )}
        </div>
      </Container>
    </div>
  );
}