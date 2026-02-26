'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { FinanceHierarchicalMenu } from './CategoryMegaMenuFinance';
import { ShowsHierarchicalMenu } from './CategoryMegaMenuShows';
import { 
  NewspaperIcon,
  ClockIcon,
  MusicalNoteIcon,
  ArrowRightIcon,
  MapPinIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

interface CategoryMegaMenuProps {
  category: any;
  onClose: () => void;
}

export function CategoryMegaMenu({ category, onClose }: CategoryMegaMenuProps) {
  // Fetch recent stories for this category
  const { data: storiesData, isLoading } = useQuery({
    queryKey: ['radio-category-stories', category.slug],
    queryFn: async () => {
      const response = await fetch(`/api/radio/stories?category=${category.slug}&perPage=6`);
      if (!response.ok) throw new Error('Failed to fetch category stories');
      return response.json();
    },
  });

  const stories = storiesData?.stories || [];

  return (
    <>
      {/* Invisible backdrop to close menu on click outside */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Mega Menu - positioned to prevent cutoff */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
        <div className="relative">
          <div className="w-[48rem] max-w-[90vw] bg-white rounded-lg shadow-xl border border-zinc-200 
                          before:absolute before:-top-2 before:left-1/2 before:transform before:-translate-x-1/2 before:w-4 before:h-4 before:bg-white before:border-l before:border-t before:border-zinc-200 before:rotate-45 before:z-10">
            <div className="relative bg-white rounded-lg overflow-hidden z-20">
              <div className="p-6 max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Heading level={3} className="text-xl font-semibold text-zinc-900">
              {category.name}
            </Heading>
            <Text className="text-zinc-600 mt-1">
              {category.name === 'News Bulletins' 
                ? 'Next upcoming bulletins (every 30 minutes)' 
                : (category.description || `Latest ${category.name.toLowerCase()} content`)
              }
            </Text>
          </div>
          {category.name !== 'News Bulletins' && (
            <Link
              href={`/radio/${category.slug}`}
              onClick={onClose}
              className="flex items-center gap-2 text-kelly-green hover:text-kelly-green-dark font-medium transition-colors"
            >
              View All
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Special case for News Bulletins */}
        {category.name === 'News Bulletins' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* 8:00 AM English Bulletin */}
              <div className="p-4 border border-zinc-200 rounded-lg hover:border-kelly-green hover:bg-kelly-green/5 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <Heading level={5} className="text-sm font-semibold text-zinc-900 group-hover:text-kelly-green">
                    Morning News Bulletin
                  </Heading>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                    <Text className="text-xs text-red-600 font-medium">LIVE</Text>
                  </div>
                </div>
                
                <Text className="text-xs text-zinc-600 mb-3">
                  Latest breaking news, weather, and traffic updates for the morning commute...
                </Text>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3 text-zinc-400" />
                    <Text className="text-xs text-zinc-500">8:00 AM</Text>
                  </div>
                  <Badge color="blue" className="text-xs">English</Badge>
                </div>
              </div>

              {/* 8:30 AM Afrikaans Bulletin */}
              <div className="p-4 border border-zinc-200 rounded-lg hover:border-kelly-green hover:bg-kelly-green/5 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <Heading level={5} className="text-sm font-semibold text-zinc-900 group-hover:text-kelly-green">
                    Oggend Nuusbulletin
                  </Heading>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3 text-amber-500" />
                    <Text className="text-xs text-amber-600 font-medium">UPCOMING</Text>
                  </div>
                </div>
                
                <Text className="text-xs text-zinc-600 mb-3">
                  Nuutste breekende nuus, weer, en verkeersopdaterings vir die oggendrit...
                </Text>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3 text-zinc-400" />
                    <Text className="text-xs text-zinc-500">8:30 AM</Text>
                  </div>
                  <Badge color="green" className="text-xs">Afrikaans</Badge>
                </div>
              </div>
            </div>

            {/* Bulletin Schedule Info */}
            <div className="border-t border-zinc-200 pt-4">
              <div className="text-center">
                <Text className="text-sm text-zinc-600 mb-2">
                  <strong>Bulletin Schedule:</strong> Every 30 minutes, alternating languages
                </Text>
                <Text className="text-xs text-zinc-500">
                  English: 8:00, 9:00, 10:00... • Afrikaans: 8:30, 9:30, 10:30...
                </Text>
              </div>
            </div>
          </>
        ) : category.name === 'News Stories' ? (
          <NewsStoriesHierarchicalMenu onClose={onClose} />
        ) : category.name === 'Sports News' || category.name === 'Sports' ? (
          <SportsHierarchicalMenu onClose={onClose} />
        ) : category.name === 'Finance' ? (
          <FinanceHierarchicalMenu onClose={onClose} />
        ) : category.name === 'Shows' ? (
          <ShowsHierarchicalMenu onClose={onClose} />
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 border border-zinc-200 rounded-lg animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-zinc-200 rounded w-1/2 mb-3"></div>
                <div className="h-16 bg-zinc-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : stories.length > 0 ? (
          <>
            {/* Stories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {stories.slice(0, 6).map((story: any) => {
                const publishedDate = new Date(story.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                
                return (
                  <Link
                    key={story.id}
                    href={`/radio/story/${story.id}`}
                    onClick={onClose}
                    className="p-4 border border-zinc-200 rounded-lg hover:border-kelly-green hover:bg-kelly-green/5 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Heading level={5} className="text-sm font-semibold text-zinc-900 group-hover:text-kelly-green line-clamp-2">
                        {story.title}
                      </Heading>
                      {story.audioClips?.length > 0 && (
                        <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0 ml-2" />
                      )}
                    </div>
                    
                    <Text className="text-xs text-zinc-600 line-clamp-2 mb-3">
                      {story.content.replace(/<[^>]*>/g, '').substring(0, 80)}...
                    </Text>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3 text-zinc-400" />
                        <Text className="text-xs text-zinc-500">{publishedDate}</Text>
                      </div>
                      
                      {/* Language badges */}
                      <div className="flex gap-1">
                        {story.tags?.filter((tag: any) => tag.category === 'LANGUAGE').slice(0, 2).map((tag: any) => (
                          <Badge key={tag.id} color="zinc" className="text-xs">
                            {tag.name === 'English' ? 'EN' : 
                             tag.name === 'Afrikaans' ? 'AF' : 
                             tag.name === 'Xhosa' ? 'XH' : tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-200">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <NewspaperIcon className="h-5 w-5 text-kelly-green mr-2" />
                  <Text className="font-semibold text-zinc-900">
                    {category.storyCount || stories.length}
                  </Text>
                </div>
                <Text className="text-xs text-zinc-500">Total Stories</Text>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <MusicalNoteIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <Text className="font-semibold text-zinc-900">
                    {stories.filter((s: any) => s.audioClips?.length > 0).length}
                  </Text>
                </div>
                <Text className="text-xs text-zinc-500">With Audio</Text>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <ClockIcon className="h-5 w-5 text-purple-500 mr-2" />
                  <Text className="font-semibold text-zinc-900">
                    {stories.filter((s: any) => {
                      const publishedDate = new Date(s.publishedAt);
                      const today = new Date();
                      const diffTime = Math.abs(today.getTime() - publishedDate.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays <= 7;
                    }).length}
                  </Text>
                </div>
                <Text className="text-xs text-zinc-500">This Week</Text>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <NewspaperIcon className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
            <Heading level={4} className="text-zinc-500 mb-2">
              No stories yet
            </Heading>
            <Text className="text-zinc-400 text-sm">
              Check back later for new {category.name.toLowerCase()} content.
            </Text>
          </div>
        )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// News Stories Hierarchical Menu Component
function NewsStoriesHierarchicalMenu({ onClose }: { onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('International News');

  // Fetch level 2 categories for News Stories
  const { data: level2Data, isLoading: categoriesLoading } = useQuery({
    queryKey: ['news-stories-level2'],
    queryFn: async () => {
      const response = await fetch('/api/radio/news-categories');
      if (!response.ok) throw new Error('Failed to fetch news categories');
      return response.json();
    },
  });

  // Fetch locality tags (provinces)
  const { data: localityData, isLoading: localityLoading } = useQuery({
    queryKey: ['locality-tags'],
    queryFn: async () => {
      const response = await fetch('/api/radio/locality-tags');
      if (!response.ok) throw new Error('Failed to fetch localities');
      return response.json();
    },
  });

  // Fetch recent stories for selected category
  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ['category-recent-stories', selectedCategory],
    queryFn: async () => {
      const response = await fetch(`/api/radio/recent-stories?category=${encodeURIComponent(selectedCategory)}&limit=4`);
      if (!response.ok) throw new Error('Failed to fetch recent stories');
      return response.json();
    },
    enabled: selectedCategory !== 'South African Community News',
  });

  const level2Categories = level2Data?.categories || [];
  const localities = localityData?.localities || [];
  const recentStories = storiesData?.stories || [];

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'International News':
        return GlobeAltIcon;
      case 'South African Community News':
        return MapPinIcon;
      case 'South African National News':
        return NewspaperIcon;
      default:
        return NewspaperIcon;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Level 2 Categories */}
      <div>
        <Heading level={4} className="text-lg font-semibold text-zinc-900 mb-4">
          News Categories
        </Heading>
        <div className="space-y-2">
          {categoriesLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-200 rounded-lg animate-pulse"></div>
            ))
          ) : (
            level2Categories.map((cat: any) => {
              const Icon = getCategoryIcon(cat.name);
              const isSelected = selectedCategory === cat.name;
              
              return (
                <div
                  key={cat.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-kelly-green bg-kelly-green/5 text-kelly-green'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700'
                  }`}
                  onMouseEnter={() => setSelectedCategory(cat.name)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <div>
                      <Text className="font-medium">{cat.name}</Text>
                      <Text className="text-xs text-zinc-500">{cat.description}</Text>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Dynamic Content */}
      <div>
        {selectedCategory === 'South African Community News' ? (
          <>
            <Heading level={4} className="text-lg font-semibold text-zinc-900 mb-4">
              Select Province
            </Heading>
            <div className="grid grid-cols-2 gap-2">
              {localityLoading ? (
                [...Array(9)].map((_, i) => (
                  <div key={i} className="h-10 bg-zinc-200 rounded animate-pulse"></div>
                ))
              ) : (
                localities.map((locality: any) => (
                  <Link
                    key={locality.id}
                    href={`/radio/news-stories/community?province=${locality.slug}`}
                    onClick={onClose}
                    className="p-2 text-sm border border-zinc-200 rounded hover:border-kelly-green hover:bg-kelly-green/5 hover:text-kelly-green transition-all text-center"
                  >
                    {locality.name}
                  </Link>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <Heading level={4} className="text-lg font-semibold text-zinc-900 mb-4">
              Recent {selectedCategory}
            </Heading>
            <div className="space-y-3">
              {storiesLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 border border-zinc-200 rounded-lg animate-pulse">
                    <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-zinc-200 rounded w-1/2"></div>
                  </div>
                ))
              ) : recentStories.length > 0 ? (
                recentStories.map((story: any) => (
                  <Link
                    key={story.id}
                    href={`/radio/story/${story.id}`}
                    onClick={onClose}
                    className="block p-3 border border-zinc-200 rounded-lg hover:border-kelly-green hover:bg-kelly-green/5 transition-all group"
                  >
                    <Heading level={6} className="text-sm font-semibold text-zinc-900 group-hover:text-kelly-green mb-1 line-clamp-2">
                      {story.title}
                    </Heading>
                    <Text className="text-xs text-zinc-600 line-clamp-2 mb-2">
                      {story.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                    </Text>
                    <div className="flex items-center justify-between">
                      <Text className="text-xs text-zinc-500">
                        {new Date(story.publishedAt).toLocaleDateString()}
                      </Text>
                      {story.audioClips?.length > 0 && (
                        <MusicalNoteIcon className="h-3 w-3 text-kelly-green" />
                      )}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6">
                  <NewspaperIcon className="h-12 w-12 text-zinc-300 mx-auto mb-2" />
                  <Text className="text-zinc-500">No recent stories available</Text>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Sports Hierarchical Menu Component  
function SportsHierarchicalMenu({ onClose }: { onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Sports News Stories');

  // Fetch level 2 categories for Sports
  const { data: level2Data, isLoading: categoriesLoading } = useQuery({
    queryKey: ['sports-level2'],
    queryFn: async () => {
      const response = await fetch('/api/radio/sports-categories');
      if (!response.ok) throw new Error('Failed to fetch sports categories');
      return response.json();
    },
  });

  // Fetch recent stories for selected category
  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ['sports-recent-stories', selectedCategory],
    queryFn: async () => {
      const response = await fetch(`/api/radio/recent-stories?category=${encodeURIComponent(selectedCategory)}&limit=4`);
      if (!response.ok) throw new Error('Failed to fetch recent stories');
      return response.json();
    },
  });

  const level2Categories = level2Data?.categories || [];
  const recentStories = storiesData?.stories || [];

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Sports News Stories':
        return NewspaperIcon;
      case 'Morning Update':
      case 'Afternoon Update':
        return ClockIcon;
      case 'Wiele2Wiele':
        return MusicalNoteIcon;
      default:
        return NewspaperIcon;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Level 2 Categories */}
      <div>
        <Heading level={4} className="text-lg font-semibold text-zinc-900 mb-4">
          Sports Content
        </Heading>
        <div className="space-y-2">
          {categoriesLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-200 rounded-lg animate-pulse"></div>
            ))
          ) : (
            level2Categories.map((cat: any) => {
              const Icon = getCategoryIcon(cat.name);
              const isSelected = selectedCategory === cat.name;
              
              return (
                <div
                  key={cat.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-kelly-green bg-kelly-green/5 text-kelly-green'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700'
                  }`}
                  onMouseEnter={() => setSelectedCategory(cat.name)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <div>
                      <Text className="font-medium">{cat.name}</Text>
                      <Text className="text-xs text-zinc-500">{cat.description}</Text>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Recent Stories */}
      <div>
        <Heading level={4} className="text-lg font-semibold text-zinc-900 mb-4">
          Recent {selectedCategory}
        </Heading>
        <div className="space-y-3">
          {storiesLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="p-3 border border-zinc-200 rounded-lg animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-zinc-200 rounded w-1/2"></div>
              </div>
            ))
          ) : recentStories.length > 0 ? (
            recentStories.map((story: any) => (
              <Link
                key={story.id}
                href={`/radio/story/${story.id}`}
                onClick={onClose}
                className="block p-3 border border-zinc-200 rounded-lg hover:border-kelly-green hover:bg-kelly-green/5 transition-all group"
              >
                <Heading level={6} className="text-sm font-semibold text-zinc-900 group-hover:text-kelly-green mb-1 line-clamp-2">
                  {story.title}
                </Heading>
                <Text className="text-xs text-zinc-600 line-clamp-2 mb-2">
                  {story.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                </Text>
                <div className="flex items-center justify-between">
                  <Text className="text-xs text-zinc-500">
                    {new Date(story.publishedAt).toLocaleDateString()}
                  </Text>
                  {story.audioClips?.length > 0 && (
                    <MusicalNoteIcon className="h-3 w-3 text-kelly-green" />
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-6">
              <NewspaperIcon className="h-12 w-12 text-zinc-300 mx-auto mb-2" />
              <Text className="text-zinc-500">No recent stories available</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}