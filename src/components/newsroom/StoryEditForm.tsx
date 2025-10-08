import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MusicalNoteIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Field, FieldGroup, Fieldset, Label, ErrorMessage } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Divider } from '@/components/ui/divider';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { FileUpload } from '@/components/ui/file-upload';
import { ReviewerSelectionModal } from './ReviewerSelectionModal';
import { RevisionRequestBanner } from '@/components/ui/revision-request-banner';
import { ReviewStatusBanner } from '@/components/ui/review-status-banner';
import { StageProgress } from '@/components/ui/stage-progress';
import {
  canApproveStory,
  canPublishStory,
  getAvailableStatusTransitions,
} from '@/lib/permissions';
import { StoryStatus, StaffRole, StoryStage } from '@prisma/client';

// Audio file interface for uploads
interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
}

// Story type interface
interface Story {
  id: string;
  title: string;
  content: string | null;
  status: StoryStatus;
  stage: StoryStage | null;
  categoryId: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    staffRole: StaffRole;
  };
  assignedReviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    staffRole: StaffRole;
  };
  assignedApprover?: {
    id: string;
    firstName: string;
    lastName: string;
    staffRole: StaffRole;
  };
  audioClips?: Array<{
    id: string;
    filename: string;
    originalName: string;
    url: string;
    duration?: number | null;
    fileSize: number;
    mimeType: string;
    description?: string | null;
    createdAt: string;
  }>;
}

// Story edit schema - works for all roles
const storyEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
});

type StoryEditFormData = z.infer<typeof storyEditSchema>;

interface StoryEditFormProps {
  storyId: string;
}

export function StoryEditForm({ storyId }: StoryEditFormProps) {
  const { data: session } = useSession();
  const router = useRouter();

  // All hooks must be called before any conditional returns
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [story, setStory] = useState<Story | null>(null);
  const [content, setContent] = useState('');
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [removedAudioIds, setRemovedAudioIds] = useState<string[]>([]);
  const [newAudioFiles, setNewAudioFiles] = useState<AudioFile[]>([]);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<StoryEditFormData>({
    resolver: zodResolver(storyEditSchema),
  });

  // Fetch revision requests for this story
  const { data: revisionRequestsData } = useQuery({
    queryKey: ['revisionRequests', storyId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/stories/${storyId}/revisions`);
      if (!response.ok) throw new Error('Failed to fetch revision requests');
      return response.json();
    },
    enabled: !!storyId,
  });

  const unresolvedRevisions = revisionRequestsData?.revisionRequests?.filter(
    (r: any) => !r.resolvedAt
  ) || [];

  // Load story data
  useEffect(() => {
    const loadStory = async () => {
      try {
        const response = await fetch(`/api/newsroom/stories/${storyId}`);
        if (!response.ok) {
          throw new Error('Failed to load story');
        }
        
        const storyData = await response.json();
        setStory(storyData);
        setContent(storyData.content || '');
        
        // Populate form with existing data
        reset({
          title: storyData.title,
          content: storyData.content,
        });
      } catch {
        toast.error('Failed to load story');
        router.push('/newsroom');
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [storyId, reset, router]);

  const onSubmit: SubmitHandler<StoryEditFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      let response;

      // If there are new audio files, use FormData
      if (newAudioFiles.length > 0) {
        const formData = new FormData();

        // Add story data
        formData.append('title', data.title);
        formData.append('content', data.content);

        // Add removed audio IDs
        if (removedAudioIds.length > 0) {
          formData.append('removedAudioIds', JSON.stringify(removedAudioIds));
        }

        // Add new audio files
        newAudioFiles.forEach((audioFile, index) => {
          formData.append(`audioFile_${index}`, audioFile.file);
        });
        formData.append('audioFilesCount', String(newAudioFiles.length));

        response = await fetch(`/api/newsroom/stories/${storyId}`, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        // No new files, use JSON
        response = await fetch(`/api/newsroom/stories/${storyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            removedAudioIds: removedAudioIds.length > 0 ? removedAudioIds : undefined,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update story');
      }

      toast.success('Story updated successfully!');
      router.push(`/newsroom/stories/${storyId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update story');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForReview = () => {
    // Show the reviewer modal
    setShowReviewerModal(true);
  };

  const handleStatusAction = async (action: { label: string; status: string; color: string }) => {
    const userRole = session?.user?.staffRole;
    const userId = session?.user?.id;
    
    if (!userRole || !story) return;
    
    // Handle different status transitions
    switch (action.status) {
      case 'IN_REVIEW':
        handleSubmitForReview();
        break;
      case 'PENDING_APPROVAL':
        // This should no longer be accessible from edit page
        toast.error('Please use the review page to submit for approval');
        break;
      case 'APPROVED':
      case 'NEEDS_REVISION':
      case 'PENDING_TRANSLATION':
      case 'READY_TO_PUBLISH':
      case 'PUBLISHED':
        // These actions would require additional handling
        toast(`${action.label} functionality not yet implemented`);
        break;
      default:
        toast.error('Unknown action');
    }
  };

  const handleReviewerSelected = async (reviewerId: string) => {
    setIsSubmitting(true);
    setShowReviewerModal(false);
    
    try {
      // First save the current changes using form values
      const titleElement = document.getElementById('title') as HTMLInputElement;
      const formData = {
        title: titleElement?.value || story?.title || '',
        content: content,
      };

      const updateResponse = await fetch(`/api/newsroom/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to save changes');
      }

      // Then update status to IN_REVIEW with reviewer assignment
      const statusResponse = await fetch(`/api/newsroom/stories/${storyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'IN_REVIEW',
          reviewerId: reviewerId 
        }),
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Status update failed:', errorData);
        throw new Error(errorData.error || 'Failed to submit for review');
      }
      
      console.log('✅ Story status updated to IN_REVIEW successfully');

      toast.success('Story submitted for review!');
      router.push(`/newsroom/stories/${storyId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit for review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusActions = (currentStatus: StoryStatus) => {
    const actions: Array<{ label: string; status: string; color: "primary" | "secondary" | "white" | "red" }> = [];
    const userRole = session?.user?.staffRole;
    const userId = session?.user?.id;
    
    if (!userRole || !story) return actions;
    
    // Check if user is the author of this story
    const isAuthor = story.authorId === userId;
    
    // Get available transitions for the current user role and status
    const availableTransitions = getAvailableStatusTransitions(userRole, currentStatus);

    // Map transitions to action buttons
    availableTransitions.forEach((newStatus) => {
      switch (newStatus) {
        case 'IN_REVIEW':
          // Only interns submit for review (to journalists)
          if (userRole === 'INTERN') {
            actions.push({
              label: currentStatus === 'DRAFT' ? 'Submit for Review' : 'Resubmit for Review',
              status: newStatus,
              color: 'primary' as const,
            });
          }
          break;
        case 'PENDING_APPROVAL':
          // This should never appear in edit form - only on review page after checklist
          break;
        case 'APPROVED':
          if (canApproveStory(userRole)) {
            actions.push({
              label: 'Approve',
              status: newStatus,
              color: 'primary',
            });
          }
          break;
        case 'NEEDS_REVISION':
          actions.push({
            label: 'Request Revision',
            status: newStatus,
            color: 'red' as const,
          });
          break;
        case 'PENDING_TRANSLATION':
          if (canApproveStory(userRole)) {
            actions.push({
              label: 'Send for Translation',
              status: newStatus,
              color: 'secondary',
            });
          }
          break;
        case 'READY_TO_PUBLISH':
          if (canPublishStory(userRole)) {
            actions.push({
              label: 'Mark Ready to Publish',
              status: newStatus,
              color: 'primary',
            });
          }
          break;
        case 'PUBLISHED':
          if (canPublishStory(userRole)) {
            actions.push({
              label: 'Publish',
              status: newStatus,
              color: 'primary',
            });
          }
          break;
      }
    });

    return actions;
  };

  const handleAudioPlay = (audioId: string) => {
    // Stop any currently playing audio
    if (playingAudioId && playingAudioId !== audioId) {
      setPlayingAudioId(null);
    }
    setPlayingAudioId(playingAudioId === audioId ? null : audioId);
  };

  const handleAudioStop = (audioId: string) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: 0 }));
    setPlayingAudioId(null);
  };

  const handleAudioRestart = (audioId: string) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: 0 }));
  };

  const handleAudioSeek = (audioId: string, time: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: time }));
  };

  const handleAudioTimeUpdate = useCallback((audioId: string, currentTime: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: currentTime }));
  }, []);

  const handleAudioLoadedMetadata = (audioId: string, duration: number) => {
    setAudioDuration(prev => ({ ...prev, [audioId]: duration }));
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading story...</p>
        </div>
      </Container>
    );
  }

  if (!story) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Story not found</p>
          <Button onClick={() => router.push('/newsroom')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </Container>
    );
  }

  const statusActions = getStatusActions(story.status);

  return (
    <Container>
      {/* Review Status Banner - Show when story is under review */}
      {story.authorId === session?.user?.id &&
       story.stage === 'NEEDS_JOURNALIST_REVIEW' &&
       story.assignedReviewer && (
        <ReviewStatusBanner
          stage={story.stage}
          reviewer={story.assignedReviewer}
          updatedAt={story.updatedAt}
          className="mb-6"
        />
      )}

      {/* Review Status Banner - Show when story is awaiting approval */}
      {story.authorId === session?.user?.id &&
       story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' &&
       story.assignedApprover && (
        <ReviewStatusBanner
          stage={story.stage}
          reviewer={story.assignedApprover}
          updatedAt={story.updatedAt}
          className="mb-6"
        />
      )}

      {/* Approval Sent Banner - For Reviewer who sent for approval */}
      {story.authorId !== session?.user?.id &&
       story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' &&
       story.assignedReviewer?.id === session?.user?.id &&
       story.assignedApprover && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Sent for Approval
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                You sent this story to {story.assignedApprover.firstName} {story.assignedApprover.lastName} for approval. They have been notified and will review it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Revision Request Banner - Show when there are unresolved revisions */}
      {unresolvedRevisions.length > 0 && story.authorId === session?.user?.id && (
        <RevisionRequestBanner
          revisionRequests={unresolvedRevisions}
          className="mb-6"
        />
      )}

      {/* Stage Progress Bar */}
      {story.stage && story.author.staffRole && (
        <StageProgress
          currentStage={story.stage as StoryStage}
          authorRole={story.author.staffRole as StaffRole}
          className="mb-8"
        />
      )}

      <div className="space-y-6">
        <PageHeader
          title={story.title}
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
                          name={`${story.author.firstName} ${story.author.lastName}`}
                        />
                        <span>{story.author.firstName} {story.author.lastName}</span>
                      </>
                    ),
                    type: 'avatar'
                  },
                  {
                    label: "Created",
                    value: formatDate(story.createdAt),
                    type: 'date'
                  },
                  {
                    label: "Last Updated",
                    value: formatDate(story.updatedAt),
                    type: 'date'
                  }
                ]
              }
            ]
          }}
          actions={
            <div className="flex items-center space-x-3">
              {/* Status Actions */}
              {statusActions.map((action) => (
                <Button
                  key={action.status}
                  color={action.color}
                  onClick={() => handleStatusAction(action)}
                  disabled={isSubmitting}
                >
                  {action.label}
                </Button>
              ))}
              
              {/* Back to Dashboard Button */}
              <Button color="secondary" href="/newsroom">
                Back to Dashboard
              </Button>
            </div>
          }
        />

        <div className="max-w-5xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Story Content */}
              <Card className="p-6">
                <Heading level={2} className="mb-6">Story Content</Heading>
                
                <Fieldset>
                  <FieldGroup>
                    <Field>
                      <Label htmlFor="title">Story Title *</Label>
                      <Input
                        id="title"
                        {...register('title')}
                        placeholder="Enter your story title..."
                        className="text-lg"
                      />
                      {errors.title && (
                        <ErrorMessage>{errors.title.message}</ErrorMessage>
                      )}
                    </Field>

                    <Field>
                      <Label htmlFor="content">Story Content *</Label>
                      <RichTextEditor
                        content={content}
                        onChange={(newContent) => {
                          setContent(newContent);
                          setValue('content', newContent);
                        }}
                        placeholder="Write your story content here..."
                        className="min-h-[400px]"
                      />
                      {errors.content && (
                        <ErrorMessage>{errors.content.message}</ErrorMessage>
                      )}
                    </Field>
                  </FieldGroup>
                </Fieldset>
              </Card>

              {/* Audio Clips Section */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level={3}>Audio Clips</Heading>
                  <Badge color="zinc">
                    {story.audioClips?.filter((clip) => !removedAudioIds.includes(clip.id)).length || 0} clips
                  </Badge>
                </div>

                {/* Existing audio clips */}
                {(!story.audioClips || story.audioClips.length === 0) ? (
                  <div className="text-center py-8 text-gray-500">
                    <MusicalNoteIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No audio clips have been attached to this story</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {story.audioClips.filter((clip) => !removedAudioIds.includes(clip.id)).map((clip) => (
                      <div key={clip.id} className="relative">
                        <CustomAudioPlayer
                          clip={{
                            ...clip,
                            url: clip.url, // Use the direct URL from storage
                            originalName: clip.originalName || clip.filename,
                            duration: clip.duration ?? null
                          }}
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
                        <Button
                          type="button"
                          color="red"
                          className="absolute top-2 right-2"
                          onClick={() => setRemovedAudioIds(ids => [...ids, clip.id])}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload new audio files */}
                <div className="mt-6">
                  <FileUpload
                    onFilesChange={setNewAudioFiles}
                    maxFiles={5}
                    maxFileSize={50}
                  />
                </div>
              </Card>

              <Divider />

              {/* Actions */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  color="white"
                  onClick={() => router.push(`/newsroom/stories/${storyId}`)}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
        </div>
      </div>

      {/* Reviewer Selection Modal */}
      <ReviewerSelectionModal
        isOpen={showReviewerModal}
        onClose={() => setShowReviewerModal(false)}
        onConfirm={handleReviewerSelected}
        storyTitle={story?.title || ''}
        isLoading={isSubmitting}
      />
    </Container>
  );
} 