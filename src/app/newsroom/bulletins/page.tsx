'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlusIcon,
  NewspaperIcon,
  ClockIcon,
  CalendarDaysIcon,
  PencilIcon,
  EyeIcon,
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
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');

  // Fetch bulletins
  const { data, isLoading } = useQuery({
    queryKey: ['bulletins', page, statusFilter, languageFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '20',
      });
      if (statusFilter) params.append('status', statusFilter);
      if (languageFilter) params.append('language', languageFilter);

      const response = await fetch(`/api/newsroom/bulletins?${params}`);
      if (!response.ok) throw new Error('Failed to fetch bulletins');
      return response.json();
    },
  });

  const bulletins: Bulletin[] = data?.bulletins || [];
  const pagination = data?.pagination;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'zinc';
      case 'IN_REVIEW': return 'yellow';
      case 'NEEDS_REVISION': return 'orange';
      case 'APPROVED': return 'blue';
      case 'PUBLISHED': return 'green';
      case 'ARCHIVED': return 'zinc';
      default: return 'zinc';
    }
  };

  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'ENGLISH': return 'blue';
      case 'AFRIKAANS': return 'green';
      case 'XHOSA': return 'purple';
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
    <Container className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <NewspaperIcon className="h-8 w-8 text-[#76BD43]" />
          <div>
            <Heading level={1} className="text-3xl font-bold text-gray-900">
              News Bulletins
            </Heading>
            <Text className="text-gray-600">
              Create and manage news bulletins for radio stations
            </Text>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Link href="/newsroom/bulletins/schedules">
            <Button outline className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5" />
              Manage Schedules
            </Button>
          </Link>
          <Link href="/newsroom/bulletins/new">
            <Button className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Create Bulletin
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#76BD43]"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="NEEDS_REVISION">Needs Revision</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#76BD43]"
            >
              <option value="">All Languages</option>
              <option value="ENGLISH">English</option>
              <option value="AFRIKAANS">Afrikaans</option>
              <option value="XHOSA">Xhosa</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Bulletins List */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <Text className="mt-2 text-gray-600">Loading bulletins...</Text>
        </Card>
      ) : bulletins.length === 0 ? (
        <Card className="p-8 text-center">
          <NewspaperIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <Heading level={3} className="text-lg font-semibold text-gray-900 mb-2">
            No bulletins found
          </Heading>
          <Text className="text-gray-600 mb-4">
            Create your first news bulletin to get started
          </Text>
          <Link href="/newsroom/bulletins/new">
            <Button className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white">
              Create Bulletin
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {bulletins.map((bulletin) => (
            <Card key={bulletin.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Heading level={3} className="text-lg font-semibold text-gray-900">
                      {bulletin.title}
                    </Heading>
                    <Badge color={getStatusColor(bulletin.status)}>
                      {bulletin.status.replace('_', ' ')}
                    </Badge>
                    <Badge color={getLanguageColor(bulletin.language)}>
                      {bulletin.language}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>By {bulletin.author.firstName} {bulletin.author.lastName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <NewspaperIcon className="h-4 w-4" />
                      {bulletin._count.bulletinStories} stories
                    </span>
                    {bulletin.schedule && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {bulletin.schedule.title} at {bulletin.schedule.time}
                        </span>
                      </>
                    )}
                    {bulletin.scheduledFor && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="h-4 w-4" />
                          {formatDate(bulletin.scheduledFor)}
                        </span>
                      </>
                    )}
                  </div>

                  {bulletin.reviewer && (
                    <Text className="text-sm text-gray-500">
                      Reviewer: {bulletin.reviewer.firstName} {bulletin.reviewer.lastName}
                    </Text>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/newsroom/bulletins/${bulletin.id}`}>
                    <Button outline className="flex items-center gap-1">
                      <EyeIcon className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  {bulletin.status === 'DRAFT' && bulletin.author.id === session?.user?.id && (
                    <Link href={`/newsroom/bulletins/${bulletin.id}/edit`}>
                      <Button outline className="flex items-center gap-1">
                        <PencilIcon className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            outline
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            outline
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </Container>
  );
}