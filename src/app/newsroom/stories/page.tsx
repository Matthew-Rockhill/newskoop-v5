'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  PencilIcon,
  EyeIcon,
  MagnifyingGlassIcon,
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
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { DataListLoading } from '@/components/ui/data-list';
import { Input, InputGroup } from '@/components/ui/input';

import { useStories, type StoryFilters } from '@/hooks/use-stories';
import { StoryStage } from '@prisma/client';
import { StoryGroupRow } from '@/components/newsroom/StoryGroupRow';

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
  const [filters, setFilters] = useState<StoryFilters>({
    page: 1,
    perPage: 10,
  });

  // Always exclude translations from main list - they appear grouped with originals
  const queryFilters = { ...filters, isTranslation: false };

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
    const assignedReviewerId = searchParams.get('assignedReviewerId');
    const assignedApproverId = searchParams.get('assignedApproverId');
    const query = searchParams.get('query');
    const page = searchParams.get('page');

    if (stage) urlFilters.stage = stage as StoryStage;
    if (authorId) urlFilters.authorId = authorId;
    if (reviewerId) urlFilters.reviewerId = reviewerId;
    if (assignedReviewerId) urlFilters.assignedReviewerId = assignedReviewerId;
    if (assignedApproverId) urlFilters.assignedApproverId = assignedApproverId;
    if (query) urlFilters.query = query;
    if (page) urlFilters.page = parseInt(page);

    setFilters(urlFilters);
  }, [searchParams]);

  const { data, isLoading, error } = useStories(queryFilters);

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
            filters.assignedReviewerId && filters.stage === 'NEEDS_JOURNALIST_REVIEW'
              ? 'Stories to Review'
              : filters.authorId
                ? 'My Stories'
                : 'Stories'
          }
          action={{
            label: "New Story",
            onClick: () => router.push('/newsroom/stories/new')
          }}
        />

        {/* Search and Stage Filters - Same row on desktop */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search - Left */}
          <div className="w-full sm:max-w-xs">
            <InputGroup>
              <MagnifyingGlassIcon data-slot="icon" />
              <Input
                type="search"
                placeholder="Search stories..."
                value={filters.query || ''}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                aria-label="Search stories"
              />
            </InputGroup>
          </div>

          {/* Stage Filter Buttons - Right */}
          <div
            role="group"
            aria-label="Filter stories by stage"
            className="flex flex-wrap items-center gap-2"
          >
            {stageFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive = filters.stage === filter.value || (!filters.stage && filter.value === null);

              return (
                <button
                  key={filter.label}
                  onClick={() => handleFilterChange('stage', filter.value || undefined)}
                  aria-pressed={isActive}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    transition-colors duration-150
                    ${isActive
                      ? 'bg-kelly-green text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }
                  `}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State - Use DataListLoading for consistency */}
        {isLoading ? (
          <DataListLoading variant="table" rowCount={5} />
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
          <>
            {/* Story Table - DataList style */}
            <div className="flow-root">
              <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                      <thead className="bg-zinc-50 dark:bg-zinc-800">
                        <tr>
                          <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                            Title
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white hidden sm:table-cell">
                            Author
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white hidden lg:table-cell">
                            Category
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                            Stage
                          </th>
                          <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white hidden sm:table-cell">
                            Updated
                          </th>
                          <th scope="col" className="pl-3 pr-4 py-3.5 text-right text-sm font-semibold text-zinc-900 dark:text-white sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900">
                        {stories.map((story: StoryWithRelations, index: number) => (
                          <StoryGroupRow key={story.id} story={story as any} index={index} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-end mt-4">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
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