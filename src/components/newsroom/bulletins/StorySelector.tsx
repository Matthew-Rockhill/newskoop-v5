'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  TagIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { debounce } from 'lodash';

interface Story {
  id: string;
  title: string;
  content: string | null;
  publishedAt: string;
  audioClips?: Array<{
    id: string;
    url: string;
    duration: number | null;
  }>;
  author: {
    firstName: string;
    lastName: string;
  };
  category: {
    name: string;
    slug: string;
  };
  tags: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}

interface StorySelectorProps {
  language: string;
  selectedStoryIds: string[];
  onAddStory: (story: Story) => void;
}

export function StorySelector({ language, selectedStoryIds, onAddStory }: StorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);

  const truncateContent = (content: string | null, maxLength: number = 100) => {
    if (!content) return 'No content available';
    // Strip HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...' 
      : textContent;
  };

  // Debounced search to avoid too many API calls
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
      setPage(1);
    }, 300),
    []
  );

  // Fetch published stories
  const { data: storiesData, isLoading } = useQuery({
    queryKey: ['published-stories', searchQuery, categoryFilter, tagFilter, language, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        stage: 'PUBLISHED',
        language,
        page: page.toString(),
        perPage: '10',
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      if (tagFilter) {
        params.append('tag', tagFilter);
      }

      const response = await fetch(`/api/newsroom/stories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stories');
      return response.json();
    },
    enabled: !!language,
  });

  // Fetch categories for filtering
  const { data: categoriesData } = useQuery({
    queryKey: ['story-categories'],
    queryFn: async () => {
      const response = await fetch('/api/newsroom/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  // Fetch tags for filtering
  const { data: tagsData } = useQuery({
    queryKey: ['story-tags'],
    queryFn: async () => {
      const response = await fetch('/api/newsroom/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    },
  });

  const stories: Story[] = storiesData?.stories || [];
  const categories = categoriesData?.categories || [];
  const tags = tagsData?.tags || [];
  const pagination = storiesData?.pagination;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTagFilter(e.target.value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setTagFilter('');
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLanguageTag = (storyTags: Story['tags']) => {
    return storyTags.find(tag => tag.category === 'LANGUAGE');
  };


  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search stories by title or content..."
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select value={categoryFilter} onChange={handleCategoryChange}>
            <option value="">All Categories</option>
            {categories.map((category: any) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>

          <Select value={tagFilter} onChange={handleTagChange}>
            <option value="">All Tags</option>
            {tags.filter((tag: any) => tag.category !== 'LANGUAGE').map((tag: any) => (
              <option key={tag.id} value={tag.slug}>
                {tag.name}
              </option>
            ))}
          </Select>
        </div>

        {(searchQuery || categoryFilter || tagFilter) && (
          <div className="flex items-center justify-between">
            <Text className="text-sm text-gray-500">
              {stories.length > 0 
                ? `Found ${pagination?.total || 0} stories`
                : 'No stories found with current filters'
              }
            </Text>
            <Button
              type="button"
              outline
              onClick={resetFilters}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Stories List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <Text className="mt-2 text-gray-600">Loading stories...</Text>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <Text className="text-gray-600">
              {searchQuery || categoryFilter || tagFilter 
                ? 'No stories match your search criteria'
                : 'No published stories available'
              }
            </Text>
          </div>
        ) : (
          stories.map((story) => {
            const isSelected = selectedStoryIds.includes(story.id);
            const languageTag = getLanguageTag(story.tags);

            return (
              <div
                key={story.id}
                className={`p-4 border rounded-lg ${
                  isSelected 
                    ? 'bg-gray-50 border-gray-300 opacity-60' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 truncate">
                        {story.title}
                      </h4>
                      {languageTag && (
                        <Badge color="blue">
                          {languageTag.name}
                        </Badge>
                      )}
                      <Badge color="green">
                        {story.category.name}
                      </Badge>
                      {story.audioClips && story.audioClips.length > 0 && (
                        <Badge color="purple" className="flex items-center gap-1">
                          <SpeakerWaveIcon className="h-3 w-3" />
                          Audio
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {truncateContent(story.content)}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {story.author.firstName} {story.author.lastName}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {formatDate(story.publishedAt)}
                      </span>
                      {story.tags.filter(t => t.category !== 'LANGUAGE').length > 0 && (
                        <span className="flex items-center gap-1">
                          <TagIcon className="h-3 w-3" />
                          {story.tags.filter(t => t.category !== 'LANGUAGE').length} tags
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => onAddStory(story)}
                    disabled={isSelected}
                    className={
                      isSelected 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-[#76BD43] hover:bg-[#76BD43]/90 text-white'
                    }
                  >
                    {isSelected ? (
                      'Added'
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4 border-t">
          <Button
            type="button"
            outline
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            type="button"
            outline
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}