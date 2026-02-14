import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MusicalNoteIcon, CheckCircleIcon, ArrowLeftIcon, TrashIcon, FolderOpenIcon } from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Field, FieldGroup, Fieldset, Label, ErrorMessage } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { FileUpload } from '@/components/ui/file-upload';
import { ReviewerSelectionModal } from './ReviewerSelectionModal';
import { AudioPickerModal } from './AudioPickerModal';
import { useLinkAudioToStory } from '@/hooks/use-audio-library';
import { RevisionRequestBanner } from '@/components/ui/revision-request-banner';
import { ReviewStatusBanner } from '@/components/ui/review-status-banner';
import { StageBadge } from '@/components/ui/stage-badge';
import { StageProgressCard } from '@/components/newsroom/WorkflowBar';

// Dynamically import RichTextEditor to reduce initial bundle size
const RichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })),
  {
    loading: () => <div className="border border-zinc-300 rounded-lg p-4 min-h-[200px] animate-pulse bg-zinc-50">Loading editor...</div>,
    ssr: false
  }
);
import {
  canApproveStory,
  canPublishStory,
  getAvailableStatusTransitions,
} from '@/lib/permissions';
import { invalidateDashboardQueries } from '@/lib/query-invalidation';
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
    audioClip: {
      id: string;
      filename: string;
      originalName: string;
      url: string;
      duration?: number | null;
      fileSize?: number | null;
      mimeType: string;
      title?: string | null;
      tags?: string[];
    };
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
  const queryClient = useQueryClient();

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
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const linkAudioMutation = useLinkAudioToStory(storyId);

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

      // Invalidate dashboard queries so changes reflect immediately
      invalidateDashboardQueries(queryClient, storyId);

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

      // Invalidate dashboard queries so changes reflect immediately
      invalidateDashboardQueries(queryClient, storyId);

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
      {/* Back Navigation */}
      <div className="mb-6">
        <Button
          color="white"
          onClick={() => router.push(`/newsroom/stories/${storyId}`)}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Story
        </Button>
      </div>

      {/* Contextual Banners */}
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
        <Card className="mb-6 p-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <Text className="font-semibold text-blue-900 dark:text-blue-100">
                Sent for Approval
              </Text>
              <Text className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                You sent this story to {story.assignedApprover.firstName} {story.assignedApprover.lastName} for approval.
              </Text>
            </div>
          </div>
        </Card>
      )}

      {/* Revision Request Banner - Show when there are unresolved revisions */}
      {unresolvedRevisions.length > 0 && story.authorId === session?.user?.id && (
        <RevisionRequestBanner
          revisionRequests={unresolvedRevisions}
          className="mb-6"
        />
      )}

      {/* Main Grid Layout - matches detail page */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Story Content Card */}
            <Card className="overflow-hidden">
              {/* Header with gradient - matches detail page */}
              <div className="bg-gradient-to-r from-kelly-green/10 to-kelly-green/5 p-6 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {story.stage && <StageBadge stage={story.stage} />}
                    <Badge color="amber">Editing</Badge>
                  </div>
                  <div className="flex items-center gap-2">
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
                  </div>
                </div>

                {/* Author Byline */}
                <div className="flex items-center gap-3">
                  <Avatar
                    className="h-10 w-10"
                    name={`${story.author.firstName} ${story.author.lastName}`}
                  />
                  <div>
                    <Text className="font-medium text-zinc-900 dark:text-zinc-100">
                      {story.author.firstName} {story.author.lastName}
                    </Text>
                    <Text className="text-sm text-zinc-500">
                      Created {formatDate(story.createdAt)}
                    </Text>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="p-6">
                <Fieldset>
                  <FieldGroup>
                    <Field>
                      <Label htmlFor="title">Story Title *</Label>
                      <Input
                        id="title"
                        {...register('title')}
                        placeholder="Enter your story title..."
                        className="text-lg font-semibold"
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
              </div>
            </Card>

            {/* Audio Clips Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MusicalNoteIcon className="h-5 w-5 text-kelly-green" />
                  <Heading level={3}>Audio Clips</Heading>
                </div>
                <Badge color="zinc">
                  {story.audioClips?.filter((sac) => !removedAudioIds.includes(sac.audioClip.id)).length || 0} clips
                </Badge>
              </div>

              {/* Existing audio clips */}
              {(!story.audioClips || story.audioClips.length === 0) ? (
                <div className="text-center py-8 text-zinc-500">
                  <MusicalNoteIcon className="h-12 w-12 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                  <Text>No audio clips attached to this story</Text>
                </div>
              ) : (
                <div className="space-y-3">
                  {story.audioClips.filter((sac) => !removedAudioIds.includes(sac.audioClip.id)).map((sac) => (
                    <div key={sac.id} className="relative group">
                      <CustomAudioPlayer
                        clip={{
                          id: sac.audioClip.id,
                          url: sac.audioClip.url,
                          originalName: sac.audioClip.title || sac.audioClip.originalName || sac.audioClip.filename,
                          duration: sac.audioClip.duration ?? null,
                          mimeType: sac.audioClip.mimeType,
                        }}
                        isPlaying={playingAudioId === sac.audioClip.id}
                        currentTime={audioProgress[sac.audioClip.id] || 0}
                        duration={audioDuration[sac.audioClip.id] || 0}
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
                        compact
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setRemovedAudioIds(ids => [...ids, sac.audioClip.id])}
                        title="Remove audio clip"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add audio options */}
              <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-3 mb-3">
                  <Button
                    type="button"
                    color="white"
                    onClick={() => setShowAudioPicker(true)}
                  >
                    <FolderOpenIcon className="h-4 w-4 mr-1.5" />
                    Browse Library
                  </Button>
                  <Text className="text-sm text-zinc-400">or upload new audio below</Text>
                </div>
                <FileUpload
                  onFilesChange={setNewAudioFiles}
                  maxFiles={5}
                  maxFileSize={50}
                />
              </div>
            </Card>

            {/* Audio Picker Modal */}
            <AudioPickerModal
              isOpen={showAudioPicker}
              onClose={() => setShowAudioPicker(false)}
              onConfirm={async (clipIds) => {
                try {
                  await linkAudioMutation.mutateAsync(clipIds);
                  // Refresh story data
                  const response = await fetch(`/api/newsroom/stories/${storyId}`);
                  if (response.ok) {
                    const data = await response.json();
                    setStory(data);
                  }
                  toast.success(`Linked ${clipIds.length} audio clip${clipIds.length !== 1 ? 's' : ''}`);
                } catch {
                  toast.error('Failed to link audio clips');
                }
              }}
              excludeClipIds={story.audioClips?.map(sac => sac.audioClip.id) || []}
              isLoading={linkAudioMutation.isPending}
            />

            {/* Form Actions - Fixed at bottom of form area */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                color="white"
                onClick={() => router.push(`/newsroom/stories/${storyId}`)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow Card */}
          <Card className="p-6">
            <Heading level={3} className="mb-4">Workflow</Heading>
            {story.stage && <StageProgressCard currentStage={story.stage} authorRole={story.author?.staffRole} />}
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <Text className="text-sm text-zinc-500">Last modified</Text>
                <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                  {new Date(story.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </div>
            </div>
          </Card>

          {/* Story Info Card */}
          <Card className="p-6">
            <Heading level={3} className="mb-4">Story Info</Heading>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Text className="text-sm text-zinc-500">Author</Text>
                <div className="flex items-center gap-2">
                  <Avatar
                    className="h-6 w-6"
                    name={`${story.author.firstName} ${story.author.lastName}`}
                  />
                  <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                    {story.author.firstName} {story.author.lastName}
                  </Text>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-sm text-zinc-500">Role</Text>
                <Badge color="zinc">{story.author.staffRole}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-sm text-zinc-500">Created</Text>
                <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                  {new Date(story.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </div>
            </div>
          </Card>

          {/* Assigned Reviewers Card - Show if assigned */}
          {(story.assignedReviewer || story.assignedApprover) && (
            <Card className="p-6">
              <Heading level={3} className="mb-4">Assigned</Heading>
              <div className="space-y-3">
                {story.assignedReviewer && (
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-zinc-500">Reviewer</Text>
                    <div className="flex items-center gap-2">
                      <Avatar
                        className="h-6 w-6"
                        name={`${story.assignedReviewer.firstName} ${story.assignedReviewer.lastName}`}
                      />
                      <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                        {story.assignedReviewer.firstName} {story.assignedReviewer.lastName}
                      </Text>
                    </div>
                  </div>
                )}
                {story.assignedApprover && (
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-zinc-500">Approver</Text>
                    <div className="flex items-center gap-2">
                      <Avatar
                        className="h-6 w-6"
                        name={`${story.assignedApprover.firstName} ${story.assignedApprover.lastName}`}
                      />
                      <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                        {story.assignedApprover.firstName} {story.assignedApprover.lastName}
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
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