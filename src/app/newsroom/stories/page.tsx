'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  TagIcon,
  CheckCircleIcon,
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Story, User, Category } from '@prisma/client';

type StoryWithRelations = Story & {
  author: User;
  category?: Category | null;
  _count?: {
    comments?: number;
  };
};

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Table } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';

import { useStories, type StoryFilters } from '@/hooks/use-stories';
import { useSession } from 'next-auth/react';
import { StoryStage } from '@prisma/client';
import { StageBadge } from '@/components/ui/stage-badge';

// Stage filter options for the new workflow
const stageFilters = [
  { value: null, label: 'All Stages', icon: null },
  { value: 'DRAFT', label: 'Draft', icon: PencilIcon },
  { value: 'NEEDS_JOURNALIST_REVIEW', label: 'Needs Review', icon: EyeIcon },
  { value: 'NEEDS_SUB_EDITOR_APPROVAL', label: 'Needs Approval', icon: CheckCircleIcon },
  { value: 'APPROVED', label: 'Approved', icon: CheckCircleIcon },
  { value: 'TRANSLATED', label: 'Translated', icon: null },
  { value: 'PUBLISHED', label: 'Published', icon: null },
] as const;

function StoriesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
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
    const stage = searchParams.get('stage');
    const authorId = searchParams.get('authorId');
    const reviewerId = searchParams.get('reviewerId');
    const query = searchParams.get('query');
    const page = searchParams.get('page');

    if (stage) urlFilters.stage = stage as StoryStage;
    if (authorId) urlFilters.authorId = authorId;
    if (reviewerId) urlFilters.reviewerId = reviewerId;
    if (query) urlFilters.query = query;
    if (page) urlFilters.page = parseInt(page);

    setFilters(urlFilters);
  }, [searchParams]);
  
  const { data, isLoading, error } = useStories(filters);

  const stories = data?.stories || [];
  const pagination = data?.pagination;

  const handleFilterChange = (key: keyof StoryFilters, value: string | number | undefined) => {
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
          <p className="text-red-600">Error loading stories: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title={
            filters.reviewerId && filters.stage === 'NEEDS_JOURNALIST_REVIEW'
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
            onClick: () => router.push('/newsroom/stories/new')
          }}
        />

        {/* Stage Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {stageFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = filters.stage === filter.value || (!filters.stage && filter.value === null);

            return (
              <Button
                key={filter.label}
                onClick={() => handleFilterChange('stage', filter.value || undefined)}
                color={isActive ? 'primary' : 'white'}
                className="text-sm"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {filter.label}
              </Button>
            );
          })}
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
              onClick: () => router.push('/newsroom/stories/new')
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
              {stories.map((story: StoryWithRelations) => (
                <tr
                  key={story.id}
                  onClick={() => router.push(`/newsroom/stories/${story.id}`)}
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
                            {story.category ? story.category.name : <span className="italic text-zinc-400">No category</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <ChatBubbleLeftRightIcon className="h-3 w-3" />
                            {story._count?.comments || 0} comments
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {formatRelativeTime(typeof story.updatedAt === 'string' ? story.updatedAt : story.updatedAt.toISOString())}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    {story.stage && <StageBadge stage={story.stage as StoryStage} />}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          router.push(`/newsroom/stories/${story.id}`);
                        }}
                        color="white"
                        className="text-sm"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Story
                      </Button>
                    </div>
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

export default function StoriesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StoriesPageContent />
    </Suspense>
  );
} 