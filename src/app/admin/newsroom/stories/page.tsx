'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  CheckCircleIcon,
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Table } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';

import { useStories, type StoryFilters } from '@/hooks/use-stories';
import { useCategories } from '@/hooks/use-categories';
import { StoryStatus } from '@prisma/client';

// Status badge colors
const statusColors = {
  DRAFT: 'zinc',
  IN_REVIEW: 'amber',
  NEEDS_REVISION: 'red',
  APPROVED: 'lime',
  PUBLISHED: 'emerald',
  ARCHIVED: 'zinc',
} as const;

export default function StoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<StoryFilters>({
    page: 1,
    perPage: 10,
  });
  
  // Read URL parameters and set initial filters
  useEffect(() => {
    const urlFilters: StoryFilters = {
      page: 1,
      perPage: 10,
    };

    // Read URL parameters
    const status = searchParams.get('status');
    const authorId = searchParams.get('authorId');
    const reviewerId = searchParams.get('reviewerId');
    const query = searchParams.get('query');
    const page = searchParams.get('page');

    if (status) urlFilters.status = status as StoryStatus;
    if (authorId) urlFilters.authorId = authorId;
    if (reviewerId) urlFilters.reviewerId = reviewerId;
    if (query) urlFilters.query = query;
    if (page) urlFilters.page = parseInt(page);

    setFilters(urlFilters);
  }, [searchParams]);
  
  const { data, isLoading, error } = useStories(filters);
  const { data: categoriesData } = useCategories(true); // Flat list for filter dropdown

  const stories = data?.stories || [];
  const pagination = data?.pagination;
  const categories = categoriesData?.categories || [];

  const handleFilterChange = (key: keyof StoryFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return formatDate(dateString);
  };

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading stories: {error.message}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title={
            filters.reviewerId && filters.status === 'IN_REVIEW' 
              ? 'Stories to Review' 
              : filters.authorId 
                ? 'My Stories'
                : 'Stories'
          }
          searchProps={{
            value: filters.query || '',
            onChange: (value) => handleFilterChange('query', value),
            placeholder: "Search stories..."
          }}
          action={{
            label: "New Story",
            onClick: () => router.push('/admin/newsroom/stories/new')
          }}
        />

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Status Filters */}
          <Button
            onClick={() => handleFilterChange('status', undefined)}
            color={!filters.status ? 'primary' : 'white'}
            className="text-sm"
          >
            All Statuses
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'DRAFT')}
            color={filters.status === 'DRAFT' ? 'primary' : 'white'}
            className="text-sm"
          >
            <PencilIcon className="h-4 w-4" />
            Draft
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'IN_REVIEW')}
            color={filters.status === 'IN_REVIEW' ? 'primary' : 'white'}
            className="text-sm"
          >
            <EyeIcon className="h-4 w-4" />
            In Review
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'APPROVED')}
            color={filters.status === 'APPROVED' ? 'primary' : 'white'}
            className="text-sm"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Approved
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'PUBLISHED')}
            color={filters.status === 'PUBLISHED' ? 'primary' : 'white'}
            className="text-sm"
          >
            Published
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p>Loading stories...</p>
          </div>
        ) : stories.length === 0 ? (
          <EmptyState
            icon={DocumentTextIcon}
            title="No stories found"
            description="Get started by creating your first story."
            action={{
              label: "New Story",
              onClick: () => router.push('/admin/newsroom/stories/new')
            }}
          />
        ) : (
          <Table striped>
            <thead>
              <tr>
                <th className="w-2/3">Story</th>
                <th className="w-1/6">Status</th>
                <th className="w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stories.map((story) => (
                <tr
                  key={story.id}
                  onClick={() => router.push(`/admin/newsroom/stories/${story.id}`)}
                  className="cursor-pointer hover:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar
                        className="h-12 w-12 flex-shrink-0"
                        name={`${story.author.firstName} ${story.author.lastName}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900 truncate">
                            {story.title}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          by {story.author.firstName} {story.author.lastName}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <TagIcon className="h-3 w-3" />
                            {story.category.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <ChatBubbleLeftRightIcon className="h-3 w-3" />
                            {story._count?.comments || 0} comments
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {formatRelativeTime(story.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <Badge color={statusColors[story.status]}>
                      {story.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <Button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        router.push(`/admin/newsroom/stories/${story.id}`);
                      }}
                      outline
                      className="text-sm"
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {pagination && pagination.totalPages > 1 && stories.length > 0 && (
          <div className="flex justify-end">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </Container>
  );
} 