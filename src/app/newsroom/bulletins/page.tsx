'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Table } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { formatLanguage } from '@/lib/language-utils';
import { 
  PlusIcon,
  NewspaperIcon,
  ClockIcon,
  CalendarDaysIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

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
  const { data, isLoading } = useQuery({
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

  const getStatusColor = (status: string) => {
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

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Bulletins"
          searchProps={{
            value: filters.query,
            onChange: (value) => handleFilterChange('query', value),
            placeholder: "Search bulletins...",
          }}
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

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleFilterChange('status', '')}
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


        {bulletins.length === 0 && !isLoading ? (
          <EmptyState
            icon={NewspaperIcon}
            title="No bulletins found"
            description="Create your first news bulletin to get started"
            action={{
              label: "Create Bulletin",
              onClick: () => router.push('/newsroom/bulletins/new')
            }}
          />
        ) : (
          <Table striped>
            <thead>
              <tr>
                <th className="w-2/3">Bulletin</th>
                <th className="w-1/6">Status</th>
                <th className="w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bulletins.map((bulletin) => (
                <tr
                  key={bulletin.id}
                  onClick={() => router.push(`/newsroom/bulletins/${bulletin.id}`)}
                  className="cursor-pointer hover:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar
                        className="h-12 w-12 flex-shrink-0"
                        name={`${bulletin.author.firstName} ${bulletin.author.lastName}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900 truncate">
                            {bulletin.title}
                          </div>
                          <Badge color="blue" className="text-xs">
                            {formatLanguage(bulletin.language)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          by {bulletin.author.firstName} {bulletin.author.lastName}
                          {bulletin.reviewer && (
                            <span> • Reviewer: {bulletin.reviewer.firstName} {bulletin.reviewer.lastName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
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
                  </td>
                  <td className="py-4">
                    <Badge color={getStatusColor(bulletin.status)}>
                      {bulletin.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          router.push(`/newsroom/bulletins/${bulletin.id}`);
                        }}
                        color="white"
                        className="text-sm"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Bulletin
                      </Button>
                      {bulletin.status === 'DRAFT' && bulletin.author.id === session?.user?.id && (
                        <Button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            router.push(`/newsroom/bulletins/${bulletin.id}/edit`);
                          }}
                          color="white"
                          className="text-sm"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {pagination && pagination.totalPages > 1 && bulletins.length > 0 && (
          <div className="flex justify-end">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => handleFilterChange('page', page)}
            />
          </div>
        )}
      </div>
    </Container>
  );
}