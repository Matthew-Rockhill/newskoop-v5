'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeftIcon,
  NewspaperIcon,
  ClockIcon,
  CalendarDaysIcon,
  PencilIcon,
  CheckCircleIcon,
  EyeIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

export default function BulletinViewPage() {
  const params = useParams();
  const router = useRouter();
  const bulletinId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['bulletin', bulletinId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/bulletins/${bulletinId}`);
      if (!response.ok) throw new Error('Failed to fetch bulletin');
      return response.json();
    },
  });

  const bulletin = data?.bulletin;

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
      <Container className="py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <Text className="mt-2 text-center text-gray-600">Loading bulletin...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-8">
        <Card className="p-8 text-center">
          <Text className="text-red-600">Error loading bulletin</Text>
          <Button outline onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          outline
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <NewspaperIcon className="h-8 w-8 text-[#76BD43]" />
          <div>
            <Heading level={1} className="text-3xl font-bold text-gray-900">
              {bulletin.title}
            </Heading>
            <div className="flex items-center gap-3 mt-2">
              <Badge color={getStatusColor(bulletin.status)}>
                {bulletin.status.replace('_', ' ')}
              </Badge>
              <Badge color={getLanguageColor(bulletin.language)}>
                {bulletin.language}
              </Badge>
              <Text className="text-gray-600">
                {bulletin._count?.bulletinStories || 0} stories
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Bulletin Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <Text className="font-semibold">Author</Text>
          </div>
          <Text>{bulletin.author?.firstName} {bulletin.author?.lastName}</Text>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
            <Text className="font-semibold">Scheduled</Text>
          </div>
          <Text>
            {bulletin.scheduledFor ? formatDate(bulletin.scheduledFor) : 'Not scheduled'}
          </Text>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <Text className="font-semibold">Schedule</Text>
          </div>
          <Text>
            {bulletin.schedule ? `${bulletin.schedule.title} (${bulletin.schedule.time})` : 'No schedule'}
          </Text>
        </Card>
      </div>

      {/* Bulletin Content */}
      <div className="space-y-6">
        {/* Introduction */}
        <Card className="p-6">
          <Heading level={2} className="text-lg font-semibold text-gray-900 mb-4">
            Introduction
          </Heading>
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: bulletin.intro }}
          />
        </Card>

        {/* Stories */}
        <Card className="p-6">
          <Heading level={2} className="text-lg font-semibold text-gray-900 mb-4">
            Stories ({bulletin._count?.bulletinStories || 0})
          </Heading>
          {bulletin.bulletinStories && bulletin.bulletinStories.length > 0 ? (
            <div className="space-y-6">
              {bulletin.bulletinStories
                .sort((a: any, b: any) => a.order - b.order)
                .map((bulletinStory: any, index: number) => (
                  <div key={bulletinStory.id} className="border border-gray-200 rounded-lg p-6">
                    {/* Story Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-[#76BD43] text-white rounded-full text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Heading level={3} className="text-lg font-semibold text-gray-900 mb-2">
                          {bulletinStory.story?.title}
                        </Heading>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-4 w-4" />
                            By {bulletinStory.story?.author?.firstName} {bulletinStory.story?.author?.lastName}
                          </span>
                          {bulletinStory.story?.category && (
                            <Badge color="green">
                              {bulletinStory.story.category.name}
                            </Badge>
                          )}
                          {bulletinStory.story?.publishedAt && (
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-4 w-4" />
                              {new Date(bulletinStory.story.publishedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Audio Player */}
                    {bulletinStory.story?.audioUrl && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6h1.5M12 9v6M9 21V3l3-3 3 3v18" />
                          </svg>
                          <Text className="font-medium text-blue-900">Audio Version</Text>
                        </div>
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
                    <div className="prose prose-sm max-w-none">
                      <div 
                        dangerouslySetInnerHTML={{ __html: bulletinStory.story?.content || '' }}
                      />
                    </div>

                    {/* Story Tags */}
                    {bulletinStory.story?.tags && bulletinStory.story.tags.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Text className="text-sm text-gray-500 font-medium">Tags:</Text>
                          {bulletinStory.story.tags
                            .filter((storyTag: any) => storyTag.tag.category !== 'LANGUAGE')
                            .map((storyTag: any) => (
                            <Badge key={storyTag.tag.id} color="zinc">
                              {storyTag.tag.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <Text className="text-gray-600 mt-2">No stories added yet</Text>
              <Text className="text-gray-500 text-sm mt-1">Add stories to your bulletin to see them here</Text>
            </div>
          )}
        </Card>

        {/* Outro */}
        <Card className="p-6">
          <Heading level={2} className="text-lg font-semibold text-gray-900 mb-4">
            Outro
          </Heading>
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: bulletin.outro }}
          />
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-8">
        {bulletin.status === 'DRAFT' && (
          <Button
            onClick={() => router.push(`/newsroom/bulletins/${bulletin.id}/edit`)}
            className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            Edit Bulletin
          </Button>
        )}
      </div>
    </Container>
  );
}