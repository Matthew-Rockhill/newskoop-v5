'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { 
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  LanguageIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Avatar } from '@/components/ui/avatar';
import { Table } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { StaffRole, TranslationStatus, StoryLanguage } from '@prisma/client';

interface Translation {
  id: string;
  status: TranslationStatus;
  targetLanguage: StoryLanguage;
  createdAt: string;
  updatedAt: string;
  originalStory: {
    id: string;
    title: string;
    author: {
      id: string;
      firstName: string;
      lastName: string;
    };
    category?: {
      name: string;
    };
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  translatedStory?: {
    id: string;
    title: string;
  };
}

const statusColors = {
  PENDING: 'zinc',
  IN_PROGRESS: 'amber',
  NEEDS_REVIEW: 'blue',
  REJECTED: 'red',
  APPROVED: 'lime',
} as const;

// Helper to check if user can view all translations
function canViewAllTranslations(userRole: StaffRole | null) {
  if (!userRole) return false;
  return ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
}

// Dedicated review section component
function ReviewSection({ translations }: { translations: Translation[] }) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (translations.length === 0) {
    return null; // Don't show section if no translations need review
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level={2} className="text-xl font-semibold">
            Translations to Review
          </Heading>
          <Text className="text-gray-600 mt-1">
            {translations.length} translation{translations.length !== 1 ? 's' : ''} awaiting sub-editor review
          </Text>
        </div>
        <Badge color="purple" className="text-sm">
          {translations.length} Pending
        </Badge>
      </div>

      <div className="space-y-4">
        {translations.map((translation) => (
          <div key={translation.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50 hover:bg-purple-100 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <Badge color="purple">
                    {translation.targetLanguage}
                  </Badge>
                  <span className="text-sm font-medium text-gray-900">
                    {translation.translatedStory?.title || translation.originalStory.title}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    <span>Original by {translation.originalStory.author.firstName} {translation.originalStory.author.lastName}</span>
                  </div>
                  {translation.assignedTo && (
                    <div className="flex items-center gap-1">
                      <Avatar 
                        className="h-4 w-4" 
                        name={`${translation.assignedTo.firstName} ${translation.assignedTo.lastName}`} 
                      />
                      <span>Translated by {translation.assignedTo.firstName} {translation.assignedTo.lastName}</span>
                    </div>
                  )}
                  {translation.originalStory.category && (
                    <Badge color="zinc">{translation.originalStory.category.name}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <ClockIcon className="h-3 w-3" />
                  <span>Submitted for review {formatDate(translation.updatedAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  color="white"
                  onClick={() => router.push(`/newsroom/translations/${translation.id}/work`)}
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Review Translation
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {translations.length > 3 && (
        <div className="mt-4 text-center">
          <Button 
            color="white" 
            onClick={() => router.push('/newsroom/translations?status=NEEDS_REVIEW')}
            className="text-sm"
          >
            View All Translations to Review
          </Button>
        </div>
      )}
    </Card>
  );
}

function TranslationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [filters, setFilters] = useState({
    query: searchParams.get('query') || '',
    status: searchParams.get('status') || '',
    assignedToId: searchParams.get('assignedToId') || '',
    targetLanguage: searchParams.get('targetLanguage') || '',
  });

  const userRole = session?.user?.staffRole as StaffRole | null;
  const userId = session?.user?.id;
  const canViewAll = canViewAllTranslations(userRole);

  // Build query string for API
  const queryString = new URLSearchParams();
  if (filters.query) queryString.set('query', filters.query);
  if (filters.status) queryString.set('status', filters.status);
  if (filters.targetLanguage) queryString.set('targetLanguage', filters.targetLanguage);
  
  // Only show user's own translations unless they have permission to see all
  if (!canViewAll && userId) {
    queryString.set('assignedToId', userId);
  } else if (filters.assignedToId) {
    queryString.set('assignedToId', filters.assignedToId);
  }

  // Fetch translations
  const { data, isLoading, error } = useQuery({
    queryKey: ['translations', filters],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/translations?${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch translations');
      return response.json();
    },
  });

  const translations = data?.translations || [];

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/newsroom/translations?${params.toString()}`);
  }, [filters, router]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Translations"
          description="Manage story translations across different languages"
          searchProps={{
            value: filters.query || '',
            onChange: (value) => handleFilterChange('query', value),
            placeholder: "Search translations..."
          }}
          actions={
            <Button color="white" onClick={() => router.push('/newsroom')}>
              Back to Dashboard
            </Button>
          }
        />

        {/* Dedicated Review Section for Sub-Editors and above */}
        {canViewAll && (
          <div className="mb-8">
            <ReviewSection translations={translations.filter((t: Translation) => t.status === 'NEEDS_REVIEW')} />
          </div>
        )}

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
            onClick={() => handleFilterChange('status', 'PENDING')}
            color={filters.status === 'PENDING' ? 'primary' : 'white'}
            className="text-sm"
          >
            <ClockIcon className="h-4 w-4" />
            Pending
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'IN_PROGRESS')}
            color={filters.status === 'IN_PROGRESS' ? 'primary' : 'white'}
            className="text-sm"
          >
            <PencilIcon className="h-4 w-4" />
            In Progress
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'NEEDS_REVIEW')}
            color={filters.status === 'NEEDS_REVIEW' ? 'primary' : 'white'}
            className="text-sm"
          >
            <EyeIcon className="h-4 w-4" />
            Needs Review
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'REJECTED')}
            color={filters.status === 'REJECTED' ? 'primary' : 'white'}
            className="text-sm"
          >
            <XCircleIcon className="h-4 w-4" />
            Rejected
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'APPROVED')}
            color={filters.status === 'APPROVED' ? 'primary' : 'white'}
            className="text-sm"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Approved
          </Button>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-8">
            <Text>Loading translations...</Text>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Text className="text-red-600">Error loading translations</Text>
          </div>
        ) : translations.length === 0 ? (
          <EmptyState
            icon={LanguageIcon}
            title="No translations found"
            description="No translations match your current filters."
          />
        ) : (
          <Table striped>
            <thead>
              <tr>
                <th className="w-2/3">Translation</th>
                <th className="w-1/6">Status</th>
                <th className="w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {translations.map((translation: Translation) => (
                <tr
                  key={translation.id}
                  onClick={() => router.push(`/newsroom/translations/${translation.id}`)}
                  className="cursor-pointer hover:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar
                        className="h-12 w-12 flex-shrink-0"
                        name={translation.assignedTo ? 
                          `${translation.assignedTo.firstName} ${translation.assignedTo.lastName}` : 
                          'Unassigned'}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900 truncate">
                            {translation.translatedStory?.title || translation.originalStory.title}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {translation.assignedTo ? 
                            `Translator: ${translation.assignedTo.firstName} ${translation.assignedTo.lastName}` :
                            'Unassigned'}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            Original by {translation.originalStory.author.firstName} {translation.originalStory.author.lastName}
                          </div>
                          <div className="flex items-center gap-1">
                            <LanguageIcon className="h-3 w-3" />
                            {translation.originalStory.language || 'ENGLISH'} → {translation.targetLanguage}
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {formatDate(translation.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <Badge color={statusColors[translation.status as keyof typeof statusColors]}>
                      {translation.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          router.push(`/newsroom/translations/${translation.id}`);
                        }}
                        color="white"
                        className="text-sm"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Translation
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </Container>
  );
}

export default function TranslationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranslationsPageContent />
    </Suspense>
  );
}