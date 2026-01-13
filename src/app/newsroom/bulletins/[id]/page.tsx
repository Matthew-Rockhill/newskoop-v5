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
        {/* Main Content - Unified Script Flow */}
        <div className="lg:col-span-2">
          <Card className="p-8">
            {/* Script Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Bulletin Script
              </h3>
              <Badge color="zinc">
                {bulletin.bulletinStories?.length || 0} stories
              </Badge>
            </div>

            {/* Continuous Script Flow */}
            <div className="relative">
              {/* Single continuous line */}
              <div
                className="absolute left-[3px] top-0 bottom-0 w-0.5"
                style={{ backgroundColor: '#76BD43' }}
              />

              {/* Introduction Section */}
              <div className="relative pl-8 pb-6">
                <div
                  className="absolute left-0 top-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#76BD43' }}
                />
                <div className="mb-2">
                  <span
                    className="inline-block px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded"
                    style={{ color: '#76BD43', backgroundColor: 'rgba(118, 189, 67, 0.1)' }}
                  >
                    Intro
                  </span>
                </div>
                <div
                  className="prose prose-sm max-w-none"
                  style={{ color: '#272727' }}
                  dangerouslySetInnerHTML={{ __html: bulletin.intro }}
                />
              </div>

              {/* Stories Section */}
              {bulletin.bulletinStories && bulletin.bulletinStories.length > 0 ? (
                bulletin.bulletinStories
                  .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
                  .map((bulletinStory: BulletinStory, index: number) => (
                    <div key={bulletinStory.id} className="relative pl-8 py-6">
                      <div
                        className="absolute left-0 top-6 flex items-center justify-center w-2 h-2 rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: '#76BD43', width: '24px', height: '24px', left: '-8px' }}
                      >
                        {index + 1}
                      </div>

                      <div className="mb-2">
                        <span
                          className="inline-block px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded"
                          style={{ color: '#76BD43', backgroundColor: 'rgba(118, 189, 67, 0.1)' }}
                        >
                          Story {index + 1}
                        </span>
                        {bulletinStory.story?.category && (
                          <span className="ml-2 text-xs text-zinc-500">
                            {bulletinStory.story.category.name}
                          </span>
                        )}
                      </div>

                      <div
                        className="prose prose-sm max-w-none"
                        style={{ color: '#272727' }}
                        dangerouslySetInnerHTML={{ __html: bulletinStory.story?.content || '' }}
                      />

                      {/* Audio Player */}
                      {bulletinStory.story?.audioUrl && (
                        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
                          <audio
                            controls
                            className="w-full h-10"
                            preload="metadata"
                          >
                            <source src={bulletinStory.story.audioUrl} type="audio/mpeg" />
                            <source src={bulletinStory.story.audioUrl} type="audio/wav" />
                            <source src={bulletinStory.story.audioUrl} type="audio/ogg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="relative pl-8 py-6">
                  <div className="text-center py-8 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
                    <svg className="mx-auto h-10 w-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-zinc-500 mt-2 text-sm">No stories added yet</p>
                  </div>
                </div>
              )}

              {/* Outro Section */}
              <div className="relative pl-8 pt-6">
                <div
                  className="absolute left-0 top-7 w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#76BD43' }}
                />
                <div className="mb-2">
                  <span
                    className="inline-block px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded"
                    style={{ color: '#76BD43', backgroundColor: 'rgba(118, 189, 67, 0.1)' }}
                  >
                    Outro
                  </span>
                </div>
                <div
                  className="prose prose-sm max-w-none"
                  style={{ color: '#272727' }}
                  dangerouslySetInnerHTML={{ __html: bulletin.outro }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bulletin Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Bulletin Details</h3>
            
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
                    <span className="text-sm text-zinc-500">{bulletin.schedule.time}</span>
                  </DescriptionDetails>
                </>
              )}
            </DescriptionList>
          </Card>

          {bulletin.publishedAt && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-zinc-900 mb-4">Publication</h3>
              
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