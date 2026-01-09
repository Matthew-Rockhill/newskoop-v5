'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DataList, type DataListColumn, type RowAction } from '@/components/ui/data-list';
import { formatLanguage } from '@/lib/language-utils';
import {
  PlusIcon,
  NewspaperIcon,
  ClockIcon,
  CalendarDaysIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Input, InputGroup } from '@/components/ui/input';

interface Bulletin {
  id: string;
  title: string;
  slug: string;
  language: 'ENGLISH' | 'AFRIKAANS' | 'XHOSA';
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  schedule?: {
    id: string;
    title: string;
    time: string;
  };
  _count: {
    bulletinStories: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function BulletinsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [filters, setFilters] = useState({
    page: 1,
    perPage: 20,
    query: '',
    status: '',
    language: '',
  });

  // Fetch bulletins
  const { data, isLoading, error } = useQuery({
    queryKey: ['bulletins', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        perPage: filters.perPage.toString(),
      });
      if (filters.query) params.append('query', filters.query);
      if (filters.status) params.append('status', filters.status);
      if (filters.language) params.append('language', filters.language);

      const response = await fetch(`/api/newsroom/bulletins?${params}`);
      if (!response.ok) throw new Error('Failed to fetch bulletins');
      return response.json();
    },
  });

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value as number : 1, // Reset to first page when filtering
    }));
  };

  const bulletins: Bulletin[] = data?.bulletins || [];
  const pagination = data?.pagination;

  const getStatusColor = (status: string): 'zinc' | 'amber' | 'red' | 'lime' | 'emerald' => {
    switch (status) {
      case 'DRAFT': return 'zinc';
      case 'IN_REVIEW': return 'amber';
      case 'NEEDS_REVISION': return 'red';
      case 'APPROVED': return 'lime';
      case 'PUBLISHED': return 'emerald';
      case 'ARCHIVED': return 'zinc';
      default: return 'zinc';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if user can edit a bulletin
  const canEdit = (bulletin: Bulletin) => {
    return bulletin.status === 'DRAFT' && bulletin.author.id === session?.user?.id;
  };

  // Define columns for the DataList
  const columns: DataListColumn<Bulletin>[] = useMemo(() => [
    {
      key: 'bulletin',
      header: 'Bulletin',
      priority: 1,
      width: 'expand',
      render: (bulletin) => (
        <div className="flex items-center gap-4">
          <Avatar
            className="h-12 w-12 flex-shrink-0"
            name={`${bulletin.author.firstName} ${bulletin.author.lastName}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-zinc-900 dark:text-white truncate">
                {bulletin.title}
              </div>
              <Badge color="blue" className="text-xs">
                {formatLanguage(bulletin.language)}
              </Badge>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
              by {bulletin.author.firstName} {bulletin.author.lastName}
              {bulletin.reviewer && (
                <span> • Reviewer: {bulletin.reviewer.firstName} {bulletin.reviewer.lastName}</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <NewspaperIcon className="h-3 w-3" />
                {bulletin._count.bulletinStories} stories
              </div>
              {bulletin.schedule ? (
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {bulletin.schedule.title} at {bulletin.schedule.time}
                </div>
              ) : bulletin.scheduledFor ? (
                <div className="flex items-center gap-1">
                  <CalendarDaysIcon className="h-3 w-3" />
                  {formatDate(bulletin.scheduledFor)}
                </div>
              ) : null}
              <div className="flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                {formatDate(bulletin.createdAt)}
              </div>
            </div>
          </div>
        </div>
      ),
      mobileRender: (bulletin) => (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Avatar
              className="h-10 w-10 flex-shrink-0"
              name={`${bulletin.author.firstName} ${bulletin.author.lastName}`}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-900 dark:text-white truncate">
                {bulletin.title}
              </div>
              <div className="text-sm text-zinc-500 truncate">
                by {bulletin.author.firstName} {bulletin.author.lastName}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <Badge color={getStatusColor(bulletin.status)}>
              {bulletin.status.replace('_', ' ')}
            </Badge>
            <Badge color="blue" className="text-xs">
              {formatLanguage(bulletin.language)}
            </Badge>
            <div className="flex items-center gap-1">
              <NewspaperIcon className="h-3 w-3" />
              {bulletin._count.bulletinStories} stories
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      priority: 2,
      width: 'shrink',
      align: 'center',
      render: (bulletin) => (
        <Badge color={getStatusColor(bulletin.status)}>
          {bulletin.status.replace('_', ' ')}
        </Badge>
      ),
    },
  ], []);

  // Define row actions
  const rowActions: RowAction<Bulletin>[] = useMemo(() => [
    {
      key: 'view',
      label: 'View',
      icon: EyeIcon,
      href: (bulletin) => `/newsroom/bulletins/${bulletin.id}`,
      onAction: () => {},
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: PencilIcon,
      href: (bulletin) => `/newsroom/bulletins/${bulletin.id}/edit`,
      onAction: () => {},
      isHidden: (bulletin) => !canEdit(bulletin),
    },
  ], [session?.user?.id]);

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Bulletins"
          actions={
            <div className="flex items-center space-x-3">
              <Link href="/newsroom/bulletins/schedules">
                <Button color="white">
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  Manage Schedules
                </Button>
              </Link>
              <Link href="/newsroom/bulletins/new">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Bulletin
                </Button>
              </Link>
            </div>
          }
        />

        {/* Search and Status Filters - Same row on desktop */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search - Left */}
          <div className="w-full sm:max-w-xs">
            <InputGroup>
              <MagnifyingGlassIcon data-slot="icon" />
              <Input
                type="search"
                placeholder="Search bulletins..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                aria-label="Search bulletins"
              />
            </InputGroup>
          </div>

          {/* Status Filter Buttons - Right */}
          <div
            role="group"
            aria-label="Filter bulletins by status"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              onClick={() => handleFilterChange('status', '')}
              aria-pressed={!filters.status}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-colors duration-150
                ${!filters.status
                  ? 'bg-kelly-green text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('status', 'DRAFT')}
              aria-pressed={filters.status === 'DRAFT'}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-colors duration-150
                ${filters.status === 'DRAFT'
                  ? 'bg-kelly-green text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
            >
              <PencilIcon className="h-4 w-4" />
              Draft
            </button>
            <button
              onClick={() => handleFilterChange('status', 'IN_REVIEW')}
              aria-pressed={filters.status === 'IN_REVIEW'}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-colors duration-150
                ${filters.status === 'IN_REVIEW'
                  ? 'bg-kelly-green text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
            >
              <EyeIcon className="h-4 w-4" />
              In Review
            </button>
            <button
              onClick={() => handleFilterChange('status', 'APPROVED')}
              aria-pressed={filters.status === 'APPROVED'}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-colors duration-150
                ${filters.status === 'APPROVED'
                  ? 'bg-kelly-green text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
            >
              <CheckCircleIcon className="h-4 w-4" />
              Approved
            </button>
            <button
              onClick={() => handleFilterChange('status', 'PUBLISHED')}
              aria-pressed={filters.status === 'PUBLISHED'}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-colors duration-150
                ${filters.status === 'PUBLISHED'
                  ? 'bg-kelly-green text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
            >
              Published
            </button>
          </div>
        </div>

        <DataList<Bulletin>
          items={bulletins}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          variant="table"
          columns={columns}
          striped
          rowActions={rowActions}
          onRowClick={(bulletin) => router.push(`/newsroom/bulletins/${bulletin.id}`)}
          getRowHref={(bulletin) => `/newsroom/bulletins/${bulletin.id}`}
          pagination={pagination ? {
            page: pagination.page,
            pageSize: 20,
            total: pagination.total,
            onPageChange: (page) => handleFilterChange('page', page),
          } : undefined}
          emptyState={{
            icon: NewspaperIcon,
            title: "No bulletins found",
            description: "Create your first news bulletin to get started.",
            action: {
              label: "Create Bulletin",
              onClick: () => router.push('/newsroom/bulletins/new'),
            },
          }}
          ariaLabel="Bulletins list"
        />
      </div>
    </Container>
  );
}