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
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
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
          actions={
            <Button onClick={() => router.push('/newsroom')}>
              Back to Dashboard
            </Button>
          }
        />

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search translations..."
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
            />
            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="REJECTED">Rejected</option>
              <option value="APPROVED">Approved</option>
            </Select>
            <Select
              value={filters.targetLanguage}
              onChange={(e) => handleFilterChange('targetLanguage', e.target.value)}
            >
              <option value="">All Languages</option>
              <option value="ENGLISH">English</option>
              <option value="AFRIKAANS">Afrikaans</option>
              <option value="XHOSA">Xhosa</option>
            </Select>
            {canViewAll && (
              <Select
                value={filters.assignedToId}
                onChange={(e) => handleFilterChange('assignedToId', e.target.value)}
              >
                <option value="">All Translators</option>
                {/* TODO: Fetch and populate translators list */}
              </Select>
            )}
          </div>
        </Card>

        {/* Quick Filters */}
        <div className="flex space-x-2 overflow-x-auto">
          <Button
            onClick={() => handleFilterChange('status', '')}
            color={!filters.status ? 'primary' : 'white'}
            className="text-sm whitespace-nowrap"
          >
            All
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'PENDING')}
            color={filters.status === 'PENDING' ? 'primary' : 'white'}
            className="text-sm whitespace-nowrap"
          >
            Pending
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'IN_PROGRESS')}
            color={filters.status === 'IN_PROGRESS' ? 'primary' : 'white'}
            className="text-sm whitespace-nowrap"
          >
            In Progress
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'NEEDS_REVIEW')}
            color={filters.status === 'NEEDS_REVIEW' ? 'primary' : 'white'}
            className="text-sm whitespace-nowrap"
          >
            Needs Review
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'APPROVED')}
            color={filters.status === 'APPROVED' ? 'primary' : 'white'}
            className="text-sm whitespace-nowrap"
          >
            Approved
          </Button>
        </div>

        {/* Results */}
        {isLoading ? (
          <Card className="p-8">
            <div className="text-center">
              <Text>Loading translations...</Text>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-8">
            <div className="text-center">
              <Text className="text-red-600">Error loading translations</Text>
            </div>
          </Card>
        ) : translations.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Text className="text-gray-500">No translations found</Text>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {translations.map((translation: Translation) => (
              <Card key={translation.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Heading level={4} className="mb-1">
                          {translation.originalStory.title}
                        </Heading>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-4 w-4" />
                            <span>Original by {translation.originalStory.author.firstName} {translation.originalStory.author.lastName}</span>
                          </div>
                          {translation.originalStory.category && (
                            <span>{translation.originalStory.category.name}</span>
                          )}
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            <span>{formatDate(translation.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={statusColors[translation.status as keyof typeof statusColors]}>
                          {translation.status.replace('_', ' ')}
                        </Badge>
                        <Badge color="blue">
                          <LanguageIcon className="h-3 w-3 mr-1" />
                          {translation.targetLanguage}
                        </Badge>
                      </div>
                    </div>

                    {translation.assignedTo && (
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar
                          className="h-6 w-6"
                          name={`${translation.assignedTo.firstName} ${translation.assignedTo.lastName}`}
                        />
                        <Text className="text-sm text-gray-600">
                          Assigned to {translation.assignedTo.firstName} {translation.assignedTo.lastName}
                        </Text>
                      </div>
                    )}

                    {translation.translatedStory && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <Text className="text-sm font-medium">
                          Translated: {translation.translatedStory.title}
                        </Text>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* Action buttons based on status and role */}
                    {translation.status === 'PENDING' && translation.assignedTo?.id === userId && (
                      <Button
                        color="primary"
                        onClick={() => router.push(`/newsroom/translations/${translation.id}/work`)}
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    
                    {translation.status === 'IN_PROGRESS' && translation.assignedTo?.id === userId && (
                      <>
                        <Button
                          color="white"
                          onClick={() => router.push(`/newsroom/translations/${translation.id}/work`)}
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                        {translation.translatedStory && (
                          <Button
                            color="secondary"
                            onClick={() => router.push(`/newsroom/translations/${translation.id}/review`)}
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        )}
                      </>
                    )}
                    
                    {translation.status === 'NEEDS_REVIEW' && canViewAll && (
                      <Button
                        color="primary"
                        onClick={() => router.push(`/newsroom/translations/${translation.id}/review`)}
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    )}
                    
                    {translation.status === 'REJECTED' && translation.assignedTo?.id === userId && (
                      <Button
                        color="secondary"
                        onClick={() => router.push(`/newsroom/translations/${translation.id}/work`)}
                      >
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Revise
                      </Button>
                    )}
                    
                    {translation.status === 'APPROVED' && (
                      <Button
                        color="white"
                        onClick={() => router.push(`/newsroom/translations/${translation.id}`)}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
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