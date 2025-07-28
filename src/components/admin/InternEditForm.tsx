import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MusicalNoteIcon } from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/Container';
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
import { ReviewerSelectionModal } from './ReviewerSelectionModal';
import { SubEditorSelectionModal } from './SubEditorSelectionModal';
import { RevisionNotes } from './RevisionNotes';
import { 
  canApproveStory, 
  canPublishStory,
  getAvailableStatusTransitions,
} from '@/lib/permissions';
import { StoryStatus } from '@prisma/client';

// Story type interface
interface Story {
  id: string;
  title: string;
  content: string | null;
  status: StoryStatus;
  priority: string;
  categoryId: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  audioClips?: Array<{
    id: string;
    title: string;
    description?: string;
    filename: string;
    duration?: number;
    createdAt: string;
  }>;
}

// Simplified schema for interns - only title and content
const internStoryEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
});

type InternStoryEditFormData = z.infer<typeof internStoryEditSchema>;

// Status badge colors
const statusColors = {
  DRAFT: 'zinc',
  IN_REVIEW: 'amber',
  NEEDS_REVISION: 'red',
  PENDING_APPROVAL: 'blue',
  APPROVED: 'lime',
  PENDING_TRANSLATION: 'purple',
  READY_TO_PUBLISH: 'emerald',
  PUBLISHED: 'emerald',
  ARCHIVED: 'gray',
} as const;

// Priority badge colors
const priorityColors = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'amber',
  URGENT: 'red',
  BREAKING: 'red',
} as const;

interface InternEditFormProps {
  storyId: string;
}

export function InternEditForm({ storyId }: InternEditFormProps) {
  const { data: session } = useSession();
  const router = useRouter();

  // All hooks must be called before any conditional returns
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [story, setStory] = useState<Story | null>(null);
  const [content, setContent] = useState('');
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [showSubEditorModal, setShowSubEditorModal] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<InternStoryEditFormData>({
    resolver: zodResolver(internStoryEditSchema),
  });

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
        router.push('/admin');
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [storyId, reset, router]);

  const onSubmit: SubmitHandler<InternStoryEditFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update story');
      }

      toast.success('Story updated successfully!');
      // Redirect based on user role
      if (session?.user?.staffRole === 'JOURNALIST') {
        router.push(`/admin/newsroom/stories/${storyId}`);
      } else {
        router.push('/admin');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update story');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForReview = () => {
    // Show the appropriate modal based on user role
    if (session?.user?.staffRole === 'JOURNALIST') {
      setShowSubEditorModal(true);
    } else {
      setShowReviewerModal(true);
    }
  };

  const handleReviewerSelected = async (reviewerId: string) => {
    setIsSubmitting(true);
    setShowReviewerModal(false);
    
    try {
      // First save the current changes
      const formData = {
        title: document.querySelector<HTMLInputElement>('#title')?.value || story.title,
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
        throw new Error('Failed to submit for review');
      }

      toast.success('Story submitted for review!');
      router.push('/admin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit for review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubEditorSelected = async (subEditorId: string) => {
    setIsSubmitting(true);
    setShowSubEditorModal(false);
    
    try {
      // First save the current changes
      const formData = {
        title: document.querySelector<HTMLInputElement>('#title')?.value || story.title,
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

      // Then update status to PENDING_APPROVAL with sub-editor assignment
      const statusResponse = await fetch(`/api/newsroom/stories/${storyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'PENDING_APPROVAL',
          assignedToId: subEditorId 
        }),
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to submit for approval');
      }

      toast.success('Story submitted for approval!');
      router.push(`/admin/newsroom/stories/${storyId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit for approval');
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
    const actions = [];
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
          actions.push({
            label: currentStatus === 'DRAFT' ? 'Submit for Review' : 'Resubmit for Review',
            status: newStatus,
            color: 'primary' as const,
          });
          break;
        case 'PENDING_APPROVAL':
          if (userRole === 'JOURNALIST') {
            if (isAuthor) {
              // Journalists submit their own stories for approval
              actions.push({
                label: 'Submit for Approval',
                status: newStatus,
                color: 'emerald' as const,
              });
            } else {
              // Journalists submit intern stories for sub-editor approval
              actions.push({
                label: 'Submit for Approval',
                status: newStatus,
                color: 'emerald' as const,
              });
            }
          }
          break;
        case 'APPROVED':
          if (canApproveStory(userRole)) {
            actions.push({
              label: 'Approve',
              status: newStatus,
              color: 'emerald' as const,
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
              color: 'purple' as const,
            });
          }
          break;
        case 'READY_TO_PUBLISH':
          if (canPublishStory(userRole)) {
            actions.push({
              label: 'Mark Ready to Publish',
              status: newStatus,
              color: 'emerald' as const,
            });
          }
          break;
        case 'PUBLISHED':
          if (canPublishStory(userRole)) {
            actions.push({
              label: 'Publish',
              status: newStatus,
              color: 'emerald' as const,
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
          <Button onClick={() => router.push('/admin')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </Container>
    );
  }

  const statusActions = getStatusActions(story.status);

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title={story.title}
          description={
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
                <Badge color={statusColors[story.status]} size="sm">
                  {story.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Priority:</span>
                <Badge color={priorityColors[story.priority]} size="sm">
                  {story.priority}
                </Badge>
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
                  size="sm"
                  onClick={() => handleSubmitForReview()}
                  disabled={isSubmitting}
                >
                  {action.label}
                </Button>
              ))}
              
              {/* Back to Story Button */}
              <Button size="sm" color="secondary" href={`/admin/newsroom/stories/${storyId}`}>
                Back to Story
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
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
                  <Badge color="gray" size="sm">
                    {story.audioClips?.length || 0} clips
                  </Badge>
                </div>
                
                {!story.audioClips || story.audioClips.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MusicalNoteIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No audio clips have been attached to this story</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {story.audioClips.map((clip) => (
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
              </Card>

              <Divider />

              {/* Actions */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  color="white"
                  onClick={() => router.push(`/admin/newsroom/stories/${storyId}`)}
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Revision Notes */}
            <RevisionNotes storyId={storyId} />
          </div>
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

      {/* Sub-Editor Selection Modal */}
      <SubEditorSelectionModal
        isOpen={showSubEditorModal}
        onClose={() => setShowSubEditorModal(false)}
        onConfirm={handleSubEditorSelected}
        storyTitle={story?.title || ''}
        isLoading={isSubmitting}
      />
    </Container>
  );
} 