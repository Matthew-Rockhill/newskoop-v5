'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  DocumentTextIcon,
  LanguageIcon,
  ArrowLeftIcon,
  ClockIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Checkbox, CheckboxGroup, CheckboxField } from '@/components/ui/checkbox';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { AudioClip as PrismaAudioClip } from '@prisma/client';
import { RevisionRequestModal } from './RevisionRequestModal';
import { SubEditorSelectionModal } from './SubEditorSelectionModal';

interface RevisionNote {
  id: string;
  content: string;
  category?: string;
}

// Dynamic Translation Review Schema
const createTranslationReviewSchema = (isSubEditor: boolean, status: string) => {
  return z.object({
    languageAccuracy: z.boolean(),
    culturalAdaptation: z.boolean(),
    completeness: z.boolean(),
    consistency: z.boolean(),
    qualityControl: z.boolean().optional(),
    finalApproval: z.boolean().optional(),
  }).superRefine((data, ctx) => {
    const requiredFields = ['languageAccuracy', 'culturalAdaptation', 'completeness', 'consistency'];
    
    // Add qualityControl as required for sub-editors reviewing NEEDS_REVIEW translations
    if (isSubEditor && status === 'NEEDS_REVIEW') {
      requiredFields.push('qualityControl');
    }
    
    requiredFields.forEach(field => {
      if (!data[field as keyof typeof data]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field.replace(/([A-Z])/g, ' $1').trim()} must be checked`,
          path: [field],
        });
      }
    });
  });
};

type ReviewChecklistData = z.infer<ReturnType<typeof createTranslationReviewSchema>>;

interface TranslationReviewFormProps {
  translationId: string;
}

// Helper functions
function canShowApproveButton(status: string) {
  return status === 'NEEDS_REVIEW';
}

function canShowRequestRevisionButton(userRole: string | null, status: string) {
  if (!userRole) return false;
  return ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole) && status === 'NEEDS_REVIEW';
}

function canShowEditButton(status: string) {
  return ['IN_PROGRESS', 'REJECTED'].includes(status);
}

function canShowSubmitForReviewButton(userRole: string | null, status: string, isOwnTranslation: boolean) {
  if (!userRole) return false;
  return status === 'IN_PROGRESS' && isOwnTranslation;
}

export function TranslationReviewForm({ translationId }: TranslationReviewFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  
  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  // Fetch translation data
  const { data: translationData, isLoading: translationLoading, error: translationError } = useQuery({
    queryKey: ['translation', translationId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/translations/${translationId}`);
      if (!response.ok) throw new Error('Failed to fetch translation');
      return response.json();
    },
  });

  const translation = translationData?.translation;
  const originalStory = translation?.originalStory;
  const translatedStory = translation?.translatedStory;
  
  const userRole = session?.user?.staffRole;
  const userId = session?.user?.id;
  const isOwnTranslation = translation?.assignedToId === userId;
  const isSubEditor = userRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);

  // Fetch available reviewers (sub-editors and above)
  // This query is currently disabled but may be needed for reviewer selection in the future
  // const { data: reviewersData } = useQuery({
  //   queryKey: ['reviewers'],
  //   queryFn: async () => {
  //     const response = await fetch('/api/admin/users?roles=SUB_EDITOR,EDITOR,ADMIN,SUPERADMIN');
  //     if (!response.ok) throw new Error('Failed to fetch reviewers');
  //     return response.json();
  //   },
  //   enabled: isOwnTranslation && translation?.status === 'IN_PROGRESS'
  // });

  // const availableReviewers = reviewersData?.users || []; // Currently unused but may be needed for reviewer selection

  const { handleSubmit, watch, setValue, formState: { isValid } } = useForm<ReviewChecklistData>({
    resolver: zodResolver(createTranslationReviewSchema(isSubEditor || false, translation?.status || '')),
    defaultValues: {
      languageAccuracy: false,
      culturalAdaptation: false,
      completeness: false,
      consistency: false,
      qualityControl: false,
      finalApproval: false,
    },
  });

  const watchedValues = watch();

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/newsroom/translations/${translationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          reviewerId: session?.user?.id,
          reviewerNotes: 'Translation approved through quality review checklist',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve translation');
      }
      
      toast.success('Translation approved successfully');
      router.push(`/newsroom/translations/${translationId}`);
    } catch {
      toast.error('Failed to approve translation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/newsroom/translations/${translationId}/work`);
  };

  const handleRequestRevision = () => {
    setShowRevisionModal(true);
  };

  const handleSubmitForReview = async () => {
    if (isOwnTranslation && !isValid) {
      toast.error('Please complete the translation review checklist before submitting for approval');
      return;
    }

    // Show reviewer selection modal
    setShowReviewerModal(true);
  };

  const handleReviewerSelected = async (reviewerId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/newsroom/translations/${translationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'NEEDS_REVIEW',
          reviewerId: reviewerId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit translation for approval');
      }
      
      toast.success('Translation submitted for approval successfully');
      router.push(`/newsroom/translations/${translationId}`);
    } catch {
      toast.error('Failed to submit translation for approval');
    } finally {
      setIsSubmitting(false);
      setShowReviewerModal(false);
    }
  };

  const handleRevisionRequested = async (revisionNotes: RevisionNote[]) => {
    setIsSubmitting(true);
    try {
      for (const note of revisionNotes) {
        if (translatedStory?.id) {
          await fetch(`/api/newsroom/stories/${translatedStory.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: note.content,
              type: 'REVISION_REQUEST',
              category: note.category || 'TRANSLATION_REVISION',
            }),
          });
        }
      }

      const response = await fetch(`/api/newsroom/translations/${translationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          reviewerId: session?.user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request revision');
      }
      
      toast.success('Revision requested successfully');
      router.push(`/newsroom/translations/${translationId}/work`);
    } catch {
      toast.error('Failed to request revision');
    } finally {
      setIsSubmitting(false);
      setShowRevisionModal(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (translationLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300 mx-auto"></div>
          <Text className="mt-4">Loading translation for review...</Text>
        </div>
      </Container>
    );
  }

  if (translationError || !translation) {
    return (
      <Container>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <Heading level={2} className="text-red-600 mb-2">Translation Not Found</Heading>
          <Text className="text-gray-600 mb-6">
            {translationError?.message || 'The translation could not be loaded.'}
          </Text>
          <Button onClick={() => router.push('/newsroom/translations')}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </Container>
    );
  }

  const statusColors = {
    PENDING: 'zinc',
    IN_PROGRESS: 'blue',
    NEEDS_REVIEW: 'amber',
    APPROVED: 'green',
    REJECTED: 'red',
  } as const;

  return (
    <>
      <Container>
        <PageHeader
          title="Translation Review"
          description={translatedStory?.title || originalStory?.title || 'Untitled Translation'}
          metadata={{
            sections: [
              {
                title: "Translation Details",
                items: [
                  {
                    label: "Status",
                    value: (
                      <Badge color={statusColors[translation.status as keyof typeof statusColors]}>
                        {translation.status.replace('_', ' ')}
                      </Badge>
                    )
                  },
                  {
                    label: "Language",
                    value: `${originalStory?.language || 'ENGLISH'} → ${translation.targetLanguage}`
                  },
                  {
                    label: "Translator",
                    value: translation.assignedTo ? 
                      `${translation.assignedTo.firstName} ${translation.assignedTo.lastName}` : 
                      'Unassigned'
                  }
                ]
              }
            ]
          }}
          actions={
            <div className="flex items-center gap-3">
              <Button
                color="white"
                onClick={() => router.push('/newsroom/translations')}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </Button>

              {/* Workflow Actions */}
              {canShowEditButton(translation.status) && isOwnTranslation && (
                <Button color="white" onClick={handleEdit}>
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Translation
                </Button>
              )}
              
              {canShowRequestRevisionButton(userRole || null, translation.status) && (
                <Button color="red" onClick={handleRequestRevision} disabled={isSubmitting}>
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  Request Revision
                </Button>
              )}
              
              {canShowSubmitForReviewButton(userRole || null, translation.status, isOwnTranslation) && (
                <Button 
                  color="primary" 
                  onClick={handleSubmitForReview} 
                  disabled={isSubmitting || (isOwnTranslation && !isValid)}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Submit for Approval
                </Button>
              )}
              
              {canShowApproveButton(translation.status) && isSubEditor && (
                <Button 
                  color="primary" 
                  onClick={handleApprove} 
                  disabled={!isValid || isSubmitting}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Approve Translation
                </Button>
              )}
            </div>
          }
        />

        {/* Status Alert */}
        {!isValid && (translation.status === 'IN_PROGRESS' || translation.status === 'NEEDS_REVIEW') && (
          <Card className={`p-4 mt-8 mb-8 ${
            translation.status === 'NEEDS_REVIEW' 
              ? 'border-amber-200 bg-amber-50' 
              : 'border-blue-200 bg-blue-50'
          }`}>
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                translation.status === 'NEEDS_REVIEW' ? 'text-amber-600' : 'text-blue-600'
              }`} />
              <div>
                <Heading level={4} className={`mb-1 ${
                  translation.status === 'NEEDS_REVIEW' ? 'text-amber-800' : 'text-blue-800'
                }`}>
                  {translation.status === 'NEEDS_REVIEW' 
                    ? 'Quality Review Required' 
                    : 'Translation Review Checklist'}
                </Heading>
                <Text className={`text-sm ${
                  translation.status === 'NEEDS_REVIEW' ? 'text-amber-700' : 'text-blue-700'
                }`}>
                  {translation.status === 'NEEDS_REVIEW'
                    ? 'Please complete the quality control review before approving this translation.'
                    : 'Complete all review items before submitting for approval.'}
                </Text>
              </div>
            </div>
          </Card>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${
          !isValid && (translation.status === 'IN_PROGRESS' || translation.status === 'NEEDS_REVIEW') ? '' : 'mt-8'
        }`}>
          {/* Main Content - Stories Comparison */}
          <div className="lg:col-span-2 space-y-6">
            {/* Original Story */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-6 w-6 text-gray-600" />
                  <Heading level={3} className="text-xl font-semibold">Original Story</Heading>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color="blue" className="text-sm">
                    {originalStory?.language || 'ENGLISH'}
                  </Badge>
                  <Badge color="zinc" className="text-sm">
                    {originalStory?.content?.replace(/<[^>]*>/g, '').split(/\s+/).filter((w: string) => w.length > 0).length || 0} words
                  </Badge>
                </div>
              </div>
              
              <div className="mb-4">
                <Heading level={4} className="text-lg font-semibold mb-2">
                  {originalStory?.title}
                </Heading>
                {originalStory?.author && (
                  <div className="flex items-center gap-2 mb-4">
                    <Avatar
                      className="h-6 w-6"
                      name={`${originalStory.author.firstName} ${originalStory.author.lastName}`}
                    />
                    <Text className="text-sm text-gray-600">
                      By {originalStory.author.firstName} {originalStory.author.lastName}
                    </Text>
                  </div>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto overflow-x-hidden">
                <div 
                  className="text-gray-700 leading-relaxed space-y-4 break-words overflow-wrap-anywhere hyphens-auto [&_pre]:whitespace-pre-wrap [&_pre]:font-sans [&_code]:font-sans [&_*]:break-words"
                  style={{ 
                    fontFamily: 'inherit', 
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}
                  dangerouslySetInnerHTML={{ __html: originalStory?.content || '<p>Content not available</p>' }}
                />
              </div>
              
              {/* Original Story Audio Clips */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <Heading level={4} className="text-sm font-semibold">Audio Clips</Heading>
                  <Badge color="zinc">
                    {originalStory?.audioClips?.length || 0} clips
                  </Badge>
                </div>
                
                {!originalStory?.audioClips || originalStory.audioClips.length === 0 ? (
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
                    {originalStory.audioClips.map((clip: Pick<PrismaAudioClip, 'id' | 'url' | 'originalName' | 'duration' | 'mimeType'>) => (
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
                          toast.error('Failed to play audio file');
                          setPlayingAudioId(null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  color="white"
                  onClick={() => router.push(`/newsroom/stories/${originalStory?.id}`)}
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  View Full Story
                </Button>
              </div>
            </Card>

            {/* Translated Story */}
            {translatedStory && (
              <Card className="p-6 border-2 border-green-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <LanguageIcon className="h-6 w-6 text-green-600" />
                    <Heading level={3} className="text-xl font-semibold">Translated Story</Heading>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color="green" className="text-sm">
                      {translation.targetLanguage}
                    </Badge>
                    <Badge color="zinc" className="text-sm">
                      {translatedStory.content?.replace(/<[^>]*>/g, '').split(/\s+/).filter((w: string) => w.length > 0).length || 0} words
                    </Badge>
                  </div>
                </div>
                
                <div className="mb-4">
                  <Heading level={4} className="text-lg font-semibold mb-2">
                    {translatedStory.title}
                  </Heading>
                  {translation.assignedTo && (
                    <div className="flex items-center gap-2 mb-4">
                      <Avatar
                        className="h-6 w-6"
                        name={`${translation.assignedTo.firstName} ${translation.assignedTo.lastName}`}
                      />
                      <Text className="text-sm text-gray-600">
                        Translated by {translation.assignedTo.firstName} {translation.assignedTo.lastName}
                      </Text>
                    </div>
                  )}
                </div>
                
                <div className="max-h-96 overflow-y-auto overflow-x-hidden">
                  <div 
                    className="text-gray-700 leading-relaxed space-y-4 break-words overflow-wrap-anywhere hyphens-auto [&_pre]:whitespace-pre-wrap [&_pre]:font-sans [&_code]:font-sans [&_*]:break-words"
                    style={{ 
                      fontFamily: 'inherit', 
                      wordBreak: 'break-word',
                      whiteSpace: 'normal'
                    }}
                    dangerouslySetInnerHTML={{ __html: translatedStory.content || '<p>Translation not available</p>' }}
                  />
                </div>
                
                {/* Translated Story Audio Clips */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Heading level={4} className="text-sm font-semibold">Audio Clips</Heading>
                    <Badge color="zinc">
                      {translatedStory.audioClips?.length || 0} clips
                    </Badge>
                  </div>
                  
                  {!translatedStory.audioClips || translatedStory.audioClips.length === 0 ? (
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
                      {translatedStory.audioClips.map((clip: Pick<PrismaAudioClip, 'id' | 'url' | 'originalName' | 'duration' | 'mimeType'>) => (
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
                            toast.error('Failed to play audio file');
                            setPlayingAudioId(null);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    color="white"
                    onClick={() => router.push(`/newsroom/stories/${translatedStory.id}`)}
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    View Full Translated Story
                  </Button>
                </div>
              </Card>
            )}

            {!translatedStory && (
              <Card className="p-6 border-dashed border-2 border-gray-300">
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <Heading level={3} className="text-gray-500 mb-2">No Translation Available</Heading>
                  <Text className="text-gray-400">
                    The translation work has not been completed yet.
                  </Text>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Review Checklist */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
                <Heading level={3} className="text-xl font-semibold">
                  {isOwnTranslation ? 'Self-Review Checklist' : 'Quality Review'}
                </Heading>
              </div>

              <form onSubmit={handleSubmit(handleApprove)}>
                <CheckboxGroup>
                  <CheckboxField>
                    <Checkbox
                      checked={watchedValues.languageAccuracy}
                      onChange={(checked) => {
                        setValue('languageAccuracy', checked, { shouldValidate: true });
                      }}
                    />
                    <div>
                      <Text className="font-medium">Language Accuracy</Text>
                      <Text className="text-sm text-gray-600">
                        Grammar, vocabulary, and language structure are correct
                      </Text>
                    </div>
                  </CheckboxField>

                  <CheckboxField>
                    <Checkbox
                      checked={watchedValues.culturalAdaptation}
                      onChange={(checked) => {
                        setValue('culturalAdaptation', checked, { shouldValidate: true });
                      }}
                    />
                    <div>
                      <Text className="font-medium">Cultural Adaptation</Text>
                      <Text className="text-sm text-gray-600">
                        Content is culturally appropriate for target audience
                      </Text>
                    </div>
                  </CheckboxField>

                  <CheckboxField>
                    <Checkbox
                      checked={watchedValues.completeness}
                      onChange={(checked) => {
                        setValue('completeness', checked, { shouldValidate: true });
                      }}
                    />
                    <div>
                      <Text className="font-medium">Completeness</Text>
                      <Text className="text-sm text-gray-600">
                        All content has been translated, nothing omitted
                      </Text>
                    </div>
                  </CheckboxField>

                  <CheckboxField>
                    <Checkbox
                      checked={watchedValues.consistency}
                      onChange={(checked) => {
                        setValue('consistency', checked, { shouldValidate: true });
                      }}
                    />
                    <div>
                      <Text className="font-medium">Consistency</Text>
                      <Text className="text-sm text-gray-600">
                        Terminology and style are consistent throughout
                      </Text>
                    </div>
                  </CheckboxField>

                  {isSubEditor && translation.status === 'NEEDS_REVIEW' && (
                    <CheckboxField>
                      <Checkbox
                        checked={watchedValues.qualityControl}
                        onChange={(checked) => {
                          setValue('qualityControl', checked, { shouldValidate: true });
                        }}
                      />
                      <div>
                        <Text className="font-medium">Quality Control</Text>
                        <Text className="text-sm text-gray-600">
                          Final quality check completed and approved
                        </Text>
                      </div>
                    </CheckboxField>
                  )}
                </CheckboxGroup>
              </form>

              {/* Checklist Status */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <Text className="text-sm font-medium text-gray-700">
                    Review Progress
                  </Text>
                  <div className="flex items-center gap-2">
                    {isValid ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        <Text className="text-sm text-green-600 font-medium">Complete</Text>
                      </>
                    ) : (
                      <>
                        <ClockIcon className="h-4 w-4 text-amber-600" />
                        <Text className="text-sm text-amber-600 font-medium">In Progress</Text>
                      </>
                    )}
                  </div>
                </div>
                
              </div>
            </Card>


            {/* Translation Timeline */}
            <Card className="p-6">
              <Heading level={4} className="font-semibold mb-4">Timeline</Heading>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <Text className="text-gray-600">Created</Text>
                  <Text className="font-medium">{formatDate(translation.createdAt)}</Text>
                </div>
                
                {translation.startedAt && (
                  <div className="flex justify-between">
                    <Text className="text-gray-600">Started</Text>
                    <Text className="font-medium">{formatDate(translation.startedAt)}</Text>
                  </div>
                )}
                
                {translation.completedAt && (
                  <div className="flex justify-between">
                    <Text className="text-gray-600">Completed</Text>
                    <Text className="font-medium">{formatDate(translation.completedAt)}</Text>
                  </div>
                )}
                
                {translation.reviewedAt && (
                  <div className="flex justify-between">
                    <Text className="text-gray-600">Reviewed</Text>
                    <Text className="font-medium">{formatDate(translation.reviewedAt)}</Text>
                  </div>
                )}
                
                <div className="flex justify-between border-t pt-2">
                  <Text className="text-gray-600">Last Updated</Text>
                  <Text className="font-medium">{formatDate(translation.updatedAt)}</Text>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Container>

      {/* Revision Request Modal */}
      {showRevisionModal && (
        <RevisionRequestModal
          isOpen={showRevisionModal}
          onClose={() => setShowRevisionModal(false)}
          onConfirm={handleRevisionRequested}
          storyTitle={originalStory?.title || 'Story'}
          isLoading={isSubmitting}
        />
      )}

      {/* Sub-Editor Selection Modal */}
      {showReviewerModal && (
        <SubEditorSelectionModal
          isOpen={showReviewerModal}
          onClose={() => setShowReviewerModal(false)}
          onConfirm={handleReviewerSelected}
          storyTitle={originalStory?.title || 'Story'}
          isLoading={isSubmitting}
        />
      )}
    </>
  );
}