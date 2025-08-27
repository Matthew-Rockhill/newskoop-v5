'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { formatLanguage } from '@/lib/language-utils';
import { 
  PencilIcon,
} from '@heroicons/react/24/outline';

interface BulletinStory {
  id: string;
  order: number;
  story?: {
    title: string;
    content: string;
    audioUrl?: string;
    author?: {
      firstName: string;
      lastName: string;
    };
    category?: {
      name: string;
    };
    publishedAt?: string;
    tags?: Array<{
      tag: {
        id: string;
        name: string;
        category: string;
      };
    }>;
  };
}

interface Bulletin {
  id: string;
  title: string;
  intro: string;
  outro: string;
  status: string;
  language: string;
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  schedule?: {
    title: string;
    time: string;
  };
  bulletinStories?: BulletinStory[];
}

export default function BulletinViewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const bulletinId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['bulletin', bulletinId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/bulletins/${bulletinId}`);
      if (!response.ok) throw new Error('Failed to fetch bulletin');
      return response.json();
    },
  });

  const bulletin: Bulletin = data?.bulletin;

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
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading bulletin...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading bulletin: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button href="/newsroom/bulletins" className="mt-4">
            Back to Bulletins
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title={bulletin.title}
        description={
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
              <Badge color={getStatusColor(bulletin.status)}>
                {bulletin.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Language:</span>
              <Badge color="blue">
                {formatLanguage(bulletin.language)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Stories:</span>
              <span className="text-sm text-zinc-900 dark:text-white">
                {bulletin.bulletinStories?.length || 0}
              </span>
            </div>
          </div>
        }
        metadata={{
          sections: [
            {
              title: "Author & Timeline",
              items: [
                {
                  label: "Author",
                  value: (
                    <>
                      <Avatar
                        className="h-6 w-6"
                        name={`${bulletin.author.firstName} ${bulletin.author.lastName}`}
                      />
                      <span>{bulletin.author.firstName} {bulletin.author.lastName}</span>
                    </>
                  ),
                  type: 'avatar'
                },
                {
                  label: "Created",
                  value: formatDate(bulletin.createdAt),
                  type: 'date'
                },
                {
                  label: "Last Updated",
                  value: formatDate(bulletin.updatedAt),
                  type: 'date'
                }
              ]
            }
          ]
        }}
        actions={
          <div className="flex items-center space-x-3">
            <Button
              color="white"
              onClick={() => router.push('/newsroom/bulletins')}
            >
              ← Back to Bulletins
            </Button>
            {bulletin.status === 'DRAFT' && bulletin.author.id === session?.user?.id && (
              <Button
                color="secondary"
                onClick={() => router.push(`/newsroom/bulletins/${bulletin.id}/edit`)}
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit Bulletin
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
        {/* Introduction */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Introduction
          </h3>
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: bulletin.intro }}
          />
        </Card>

        {/* Stories */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Stories
            </h3>
            <Badge color="zinc">
              {bulletin.bulletinStories?.length || 0} stories
            </Badge>
          </div>
          {bulletin.bulletinStories && bulletin.bulletinStories.length > 0 ? (
            <div className="space-y-8 pl-12">
              {bulletin.bulletinStories
                .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
                .map((bulletinStory: BulletinStory, index: number) => (
                  <div key={bulletinStory.id} className="relative pb-8 border-b border-gray-200 last:border-b-0 last:pb-0">
                    {/* Story Number */}
                    <div className="absolute -left-12 top-0 flex items-center justify-center w-8 h-8 bg-[#76BD43] text-white rounded-full text-sm font-semibold">
                      {index + 1}
                    </div>

                    {/* Audio Player */}
                    {bulletinStory.story?.audioUrl && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <audio 
                          controls 
                          className="w-full"
                          preload="metadata"
                        >
                          <source src={bulletinStory.story.audioUrl} type="audio/mpeg" />
                          <source src={bulletinStory.story.audioUrl} type="audio/wav" />
                          <source src={bulletinStory.story.audioUrl} type="audio/ogg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}

                    {/* Story Content */}
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: bulletinStory.story?.content || '' }}
                    />
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 mt-2">No stories added yet</p>
              <p className="text-gray-500 text-sm mt-1">Add stories to your bulletin to see them here</p>
            </div>
          )}
        </Card>

          {/* Outro */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Outro
            </h3>
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: bulletin.outro }}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bulletin Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulletin Details</h3>
            
            <DescriptionList>
              <DescriptionTerm>Language</DescriptionTerm>
              <DescriptionDetails>
                <Badge color="blue">
                  {formatLanguage(bulletin.language)}
                </Badge>
              </DescriptionDetails>

              <DescriptionTerm>Total Stories</DescriptionTerm>
              <DescriptionDetails>
                {bulletin.bulletinStories?.length || 0}
              </DescriptionDetails>

              {bulletin.scheduledFor && (
                <>
                  <DescriptionTerm>Scheduled For</DescriptionTerm>
                  <DescriptionDetails>
                    {formatDate(bulletin.scheduledFor)}
                  </DescriptionDetails>
                </>
              )}

              {bulletin.schedule && (
                <>
                  <DescriptionTerm>Schedule</DescriptionTerm>
                  <DescriptionDetails>
                    {bulletin.schedule.title}
                    <br />
                    <span className="text-sm text-gray-500">{bulletin.schedule.time}</span>
                  </DescriptionDetails>
                </>
              )}
            </DescriptionList>
          </Card>

          {bulletin.publishedAt && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Publication</h3>
              
              <DescriptionList>
                <DescriptionTerm>Published</DescriptionTerm>
                <DescriptionDetails>
                  {formatDate(bulletin.publishedAt)}
                </DescriptionDetails>
              </DescriptionList>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}