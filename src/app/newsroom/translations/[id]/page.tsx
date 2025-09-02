'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { 
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LanguageIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Avatar } from '@/components/ui/avatar';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { StaffRole, TranslationStatus, AudioClip as PrismaAudioClip } from '@prisma/client';

interface TranslationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const statusColors = {
  PENDING: 'zinc',
  IN_PROGRESS: 'amber',
  NEEDS_REVIEW: 'blue',
  REJECTED: 'red',
  APPROVED: 'lime',
} as const;

const statusIcons = {
  PENDING: ClockIcon,
  IN_PROGRESS: PencilIcon,
  NEEDS_REVIEW: EyeIcon,
  REJECTED: ExclamationTriangleIcon,
  APPROVED: CheckCircleIcon,
} as const;

// Helper functions
function canEditTranslation(userRole: StaffRole | null, status: TranslationStatus, isAssignedTranslator: boolean) {
  if (!isAssignedTranslator) return false;
  return ['PENDING', 'IN_PROGRESS', 'REJECTED'].includes(status);
}

function canReviewTranslation(userRole: StaffRole | null, status: TranslationStatus, isAssignedTranslator: boolean) {
  // Translators can review their own work when IN_PROGRESS
  if (isAssignedTranslator && status === 'IN_PROGRESS') return true;
  
  // Sub-editors and above can review when NEEDS_REVIEW
  if (userRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole) && status === 'NEEDS_REVIEW') {
    return true;
  }
  
  return false;
}

export default function TranslationDetailPage({ params }: TranslationDetailPageProps) {
  return <TranslationDetail params={params} />;
}

function TranslationDetail({ params }: { params: Promise<{ id: string }> }) {
  const [translationId, setTranslationId] = React.useState<string>('');
  
  React.useEffect(() => {
    params.then(({ id }) => setTranslationId(id));
  }, [params]);
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.staffRole as StaffRole | null;
  const userId = session?.user?.id;

  // Fetch translation details
  const { data, isLoading, error } = useQuery({
    queryKey: ['translation', translationId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/translations/${translationId}`);
      if (!response.ok) throw new Error('Failed to fetch translation');
      return response.json();
    },
    enabled: !!translationId,
  });

  const translation = data?.translation;
  const isAssignedTranslator = translation?.assignedToId === userId;

  // Audio player state
  const [playingAudioId, setPlayingAudioId] = React.useState<string | null>(null);
  const [audioProgress, setAudioProgress] = React.useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = React.useState<Record<string, number>>({});

  // Audio player handlers
  const handleAudioPlay = (clipId: string) => {
    setPlayingAudioId(clipId);
  };

  const handleAudioStop = () => {
    setPlayingAudioId(null);
  };

  const handleAudioRestart = (clipId: string) => {
    setAudioProgress(prev => ({ ...prev, [clipId]: 0 }));
    setPlayingAudioId(clipId);
  };

  const handleAudioSeek = (clipId: string, time: number) => {
    setAudioProgress(prev => ({ ...prev, [clipId]: time }));
  };

  const handleAudioTimeUpdate = (clipId: string, currentTime: number) => {
    setAudioProgress(prev => ({ ...prev, [clipId]: currentTime }));
  };

  const handleAudioLoadedMetadata = (clipId: string, duration: number) => {
    setAudioDuration(prev => ({ ...prev, [clipId]: duration }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
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
          <Text>Loading translation details...</Text>
        </div>
      </Container>
    );
  }

  if (error || !translation) {
    return (
      <Container>
        <div className="text-center py-12">
          <Text className="text-red-600">Error loading translation</Text>
          <Button onClick={() => router.push('/newsroom/translations')} className="mt-4">
            Back
          </Button>
        </div>
      </Container>
    );
  }

  const StatusIcon = statusIcons[translation.status as keyof typeof statusIcons];
  const canEdit = canEditTranslation(userRole, translation.status, isAssignedTranslator);
  const canReview = canReviewTranslation(userRole, translation.status, isAssignedTranslator);

  return (
    <Container>
      <PageHeader
        title={translation.translatedStory?.title || translation.originalStory.title}
        description={
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
              <Badge color={statusColors[translation.status as keyof typeof statusColors]}>
                {translation.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Language:</span>
              <Badge color="zinc">
                {translation.originalStory.language} → {translation.targetLanguage}
              </Badge>
            </div>
          </div>
        }
        metadata={{
          sections: [
            {
              title: "Assignment & Timeline",
              items: [
                {
                  label: "Assigned To",
                  value: translation.assignedTo ? 
                    `${translation.assignedTo.firstName} ${translation.assignedTo.lastName}` : 
                    'Unassigned'
                },
                {
                  label: "Created",
                  value: formatDate(translation.createdAt)
                },
                {
                  label: "Last Updated",
                  value: formatDate(translation.updatedAt)
                }
              ]
            },
            {
              title: "Original Story",
              items: [
                {
                  label: "Author",
                  value: `${translation.originalStory.author.firstName} ${translation.originalStory.author.lastName}`
                },
                {
                  label: "Category",
                  value: translation.originalStory.category?.name || 'No category'
                }
              ]
            }
          ]
        }}
        actions={
          <Button
            color="white"
            onClick={() => router.push('/newsroom/translations')}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      {/* Action Buttons */}
      <Card className="p-6 mt-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Basic Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                color="white"
                onClick={() => router.push(`/newsroom/stories/${translation.originalStory.id}`)}
              >
                <DocumentTextIcon className="h-4 w-4 mr-1" />
                View Original Story
              </Button>
              
              {translation.translatedStory && (
                <Button
                  color="white"
                  onClick={() => router.push(`/newsroom/stories/${translation.translatedStory.id}`)}
                >
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  View Translated Story
                </Button>
              )}
            </div>

            {/* Workflow Actions */}
            <div className="flex flex-wrap gap-3 sm:border-l sm:pl-4">
              {canEdit && (
                <Button
                  color="primary"
                  onClick={() => router.push(`/newsroom/translations/${translationId}/work`)}
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  {translation.status === 'PENDING' ? 'Start Translation' : 
                   translation.status === 'REJECTED' ? 'Revise Translation' : 'Continue Translation'}
                </Button>
              )}
              
              {canReview && (
                <Button
                  color="secondary"
                  onClick={() => router.push(`/newsroom/translations/${translationId}/review`)}
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Review Translation
                </Button>
              )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Original Story */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Heading level={3}>Original Story</Heading>
                <Badge color="blue">
                  <LanguageIcon className="h-3 w-3 mr-1" />
                  {translation.originalStory.language}
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Heading level={4}>{translation.originalStory.title}</Heading>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar
                      className="h-6 w-6"
                      name={`${translation.originalStory.author.firstName} ${translation.originalStory.author.lastName}`}
                    />
                    <Text className="text-sm text-gray-600">
                      By {translation.originalStory.author.firstName} {translation.originalStory.author.lastName}
                    </Text>
                    {translation.originalStory.category && (
                      <>
                        <span className="text-gray-400">•</span>
                        <Text className="text-sm text-gray-600">
                          {translation.originalStory.category.name}
                        </Text>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="max-w-full">
                  <div 
                    className="text-gray-700 leading-relaxed"
                    style={{ 
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%',
                      wordBreak: 'break-word'
                    }}
                    dangerouslySetInnerHTML={{ __html: translation.originalStory.content }}
                  />
                </div>
                
                {/* Original Story Audio Clips */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Heading level={4} className="text-sm font-semibold">Audio Clips</Heading>
                    <Badge color="zinc">
                      {translation.originalStory.audioClips?.length || 0} clips
                    </Badge>
                  </div>
                  
                  {!translation.originalStory.audioClips || translation.originalStory.audioClips.length === 0 ? (
                    <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MusicalNoteIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <Text className="text-xs font-medium text-gray-700">No Audio Clips</Text>
                          <Text className="text-xs text-gray-500">This story has no audio content</Text>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {translation.originalStory.audioClips.map((clip: Pick<PrismaAudioClip, 'id' | 'url' | 'originalName' | 'duration'>) => (
                        <CustomAudioPlayer
                          key={clip.id}
                          clip={clip}
                          isPlaying={playingAudioId === clip.id}
                          currentTime={audioProgress[clip.id] || 0}
                          duration={audioDuration[clip.id] || 0}
                          onPlay={handleAudioPlay}
                          onStop={handleAudioStop}
                          onRestart={handleAudioRestart}
                          onSeek={handleAudioSeek}
                          onTimeUpdate={handleAudioTimeUpdate}
                          onLoadedMetadata={handleAudioLoadedMetadata}
                          onEnded={() => setPlayingAudioId(null)}
                          onError={() => {
                            console.error('Failed to play audio file');
                            setPlayingAudioId(null);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
              </div>
            </Card>

            {/* Translated Story (if exists) */}
            {translation.translatedStory && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level={3}>Translated Story</Heading>
                  <Badge color="green">
                    <LanguageIcon className="h-3 w-3 mr-1" />
                    {translation.targetLanguage}
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Heading level={4}>{translation.translatedStory.title}</Heading>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar
                        className="h-6 w-6"
                        name={`${translation.assignedTo?.firstName} ${translation.assignedTo?.lastName}`}
                      />
                      <Text className="text-sm text-gray-600">
                        Translated by {translation.assignedTo?.firstName} {translation.assignedTo?.lastName}
                      </Text>
                    </div>
                  </div>
                  
                  <div className="overflow-x-hidden">
                    <div 
                      className="text-gray-700 leading-relaxed space-y-4 break-words overflow-wrap-anywhere hyphens-auto [&_pre]:whitespace-pre-wrap [&_pre]:font-sans [&_code]:font-sans [&_*]:break-words"
                      style={{ 
                        fontFamily: 'inherit', 
                        wordBreak: 'break-word',
                        whiteSpace: 'normal'
                      }}
                      dangerouslySetInnerHTML={{ __html: translation.translatedStory.content }}
                    />
                  </div>
                  
                  {/* Translated Story Audio Clips */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <Heading level={4} className="text-sm font-semibold">Audio Clips</Heading>
                      <Badge color="zinc">
                        {translation.translatedStory.audioClips?.length || 0} clips
                      </Badge>
                    </div>
                    
                    {!translation.translatedStory.audioClips || translation.translatedStory.audioClips.length === 0 ? (
                      <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <MusicalNoteIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <div>
                            <Text className="text-xs font-medium text-green-700">No Audio Clips</Text>
                            <Text className="text-xs text-green-600">Translation inherits original audio clips</Text>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {translation.translatedStory.audioClips.map((clip: Pick<PrismaAudioClip, 'id' | 'url' | 'originalName' | 'duration'>) => (
                          <CustomAudioPlayer
                            key={clip.id}
                            clip={clip}
                            isPlaying={playingAudioId === clip.id}
                            currentTime={audioProgress[clip.id] || 0}
                            duration={audioDuration[clip.id] || 0}
                            onPlay={handleAudioPlay}
                            onStop={handleAudioStop}
                            onRestart={handleAudioRestart}
                            onSeek={handleAudioSeek}
                            onTimeUpdate={handleAudioTimeUpdate}
                            onLoadedMetadata={handleAudioLoadedMetadata}
                            onEnded={() => setPlayingAudioId(null)}
                            onError={() => {
                              console.error('Failed to play audio file');
                              setPlayingAudioId(null);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  
                </div>
              </Card>
            )}

            {/* Notes */}
            {(translation.translatorNotes || translation.reviewerNotes || translation.rejectionReason) && (
              <Card className="p-6">
                <Heading level={3} className="mb-4">Notes & Feedback</Heading>
                
                <div className="space-y-4">
                  {translation.translatorNotes && (
                    <div>
                      <Text className="font-medium text-gray-700 mb-1">Translator Notes</Text>
                      <div className="p-3 bg-gray-50 rounded">
                        <Text>{translation.translatorNotes}</Text>
                      </div>
                    </div>
                  )}
                  
                  {translation.reviewerNotes && (
                    <div>
                      <Text className="font-medium text-gray-700 mb-1">Reviewer Notes</Text>
                      <div className="p-3 bg-blue-50 rounded">
                        <Text>{translation.reviewerNotes}</Text>
                      </div>
                    </div>
                  )}
                  
                  {translation.rejectionReason && (
                    <div>
                      <Text className="font-medium text-gray-700 mb-1">Rejection Reason</Text>
                      <div className="p-3 bg-red-50 rounded">
                        <Text className="text-red-700">{translation.rejectionReason}</Text>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignment Info */}
            <Card className="p-6">
              <Heading level={3} className="mb-4">Assignment Details</Heading>
              
              <DescriptionList>
                <DescriptionTerm>Status</DescriptionTerm>
                <DescriptionDetails>
                  <Badge color={statusColors[translation.status as keyof typeof statusColors]}>
                    {translation.status.replace('_', ' ')}
                  </Badge>
                </DescriptionDetails>

                <DescriptionTerm>Target Language</DescriptionTerm>
                <DescriptionDetails>
                  <Badge color="blue">
                    <LanguageIcon className="h-3 w-3 mr-1" />
                    {translation.targetLanguage}
                  </Badge>
                </DescriptionDetails>

                <DescriptionTerm>Assigned To</DescriptionTerm>
                <DescriptionDetails>
                  {translation.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        className="h-6 w-6"
                        name={`${translation.assignedTo.firstName} ${translation.assignedTo.lastName}`}
                      />
                      <span>{translation.assignedTo.firstName} {translation.assignedTo.lastName}</span>
                    </div>
                  ) : (
                    <Text className="text-gray-500">Unassigned</Text>
                  )}
                </DescriptionDetails>

                {translation.reviewer && (
                  <>
                    <DescriptionTerm>Reviewed By</DescriptionTerm>
                    <DescriptionDetails>
                      <div className="flex items-center gap-2">
                        <Avatar
                          className="h-6 w-6"
                          name={`${translation.reviewer.firstName} ${translation.reviewer.lastName}`}
                        />
                        <span>{translation.reviewer.firstName} {translation.reviewer.lastName}</span>
                      </div>
                    </DescriptionDetails>
                  </>
                )}
              </DescriptionList>
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <Heading level={3} className="mb-4">Timeline</Heading>
              
              <DescriptionList>
                <DescriptionTerm>Created</DescriptionTerm>
                <DescriptionDetails>{formatDate(translation.createdAt)}</DescriptionDetails>

                {translation.startedAt && (
                  <>
                    <DescriptionTerm>Started</DescriptionTerm>
                    <DescriptionDetails>{formatDate(translation.startedAt)}</DescriptionDetails>
                  </>
                )}

                {translation.completedAt && (
                  <>
                    <DescriptionTerm>Completed</DescriptionTerm>
                    <DescriptionDetails>{formatDate(translation.completedAt)}</DescriptionDetails>
                  </>
                )}

                {translation.reviewedAt && (
                  <>
                    <DescriptionTerm>Reviewed</DescriptionTerm>
                    <DescriptionDetails>{formatDate(translation.reviewedAt)}</DescriptionDetails>
                  </>
                )}

                {translation.approvedAt && (
                  <>
                    <DescriptionTerm>Approved</DescriptionTerm>
                    <DescriptionDetails>{formatDate(translation.approvedAt)}</DescriptionDetails>
                  </>
                )}

                {translation.rejectedAt && (
                  <>
                    <DescriptionTerm>Rejected</DescriptionTerm>
                    <DescriptionDetails>{formatDate(translation.rejectedAt)}</DescriptionDetails>
                  </>
                )}

                <DescriptionTerm>Last Updated</DescriptionTerm>
                <DescriptionDetails>{formatDate(translation.updatedAt)}</DescriptionDetails>
              </DescriptionList>
            </Card>
        </div>
      </div>
    </Container>
  );
}