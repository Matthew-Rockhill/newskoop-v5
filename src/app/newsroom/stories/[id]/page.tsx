'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  MusicalNoteIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { Dialog, DialogTitle, DialogDescription, DialogActions } from '@/components/ui/dialog';

import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { TranslationSelectionModal } from '@/components/newsroom/TranslationSelectionModal';
import { TranslationUnit } from '@/components/newsroom/TranslationUnit';

import { useStory, useDeleteStory } from '@/hooks/use-stories';
import { 
  canEditStory, 
  canDeleteStory, 
  getEditLockReason,
  canUpdateStoryStatus
} from '@/lib/permissions';
import { StaffRole, StoryStatus, AudioClip } from '@prisma/client';

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
  ARCHIVED: 'zinc',
} as const;


// Helper: should show submit for review button (interns only)
function canShowSubmitForReviewButton(userRole: StaffRole | null, status: string, authorId: string, userId: string | null) {
  if (!userRole || !userId) return false;
  // Only interns can submit their own draft stories for review
  return userRole === 'INTERN' && status === 'DRAFT' && authorId === userId;
}

// Helper: should show request revision button
function canShowRequestRevisionButton(userRole: StaffRole | null, status: string, isOwnStory: boolean = false) {
  if (!userRole) return false;
  // Journalists can request revision when reviewing OTHER people's stories
  if (userRole === 'JOURNALIST' && status === 'IN_REVIEW' && !isOwnStory) return true;
  // Sub-editors and above can request revision on PENDING_APPROVAL stories
  if (
    ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole) &&
    status === 'PENDING_APPROVAL'
  ) return true;
  return false;
}

// Helper: should show final review button
function canShowFinalReviewButton(userRole: StaffRole | null, status: string, isOwnStory: boolean = false) {
  if (!userRole) return false;
  // Journalists reviewing intern stories (IN_REVIEW status)
  if (userRole === 'JOURNALIST' && status === 'IN_REVIEW' && !isOwnStory) return true;
  // Sub-editors and above reviewing PENDING_APPROVAL stories
  if (
    ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole) &&
    status === 'PENDING_APPROVAL'
  ) return true;
  return false;
}

// Helper: should show edit button
function canShowEditButton(userRole: StaffRole | null, authorId: string, userId: string | null, status: string) {
  // Use the permissions system - it already handles which statuses are editable
  return canEditStory(userRole, authorId, userId ?? '', status as StoryStatus);
}

// Helper: should show delete button
function canShowDeleteButton(userRole: StaffRole | null, status: string) {
  // Only allow delete for DRAFT and NEEDS_REVISION (not IN_REVIEW)
  const deletableStatuses = ['DRAFT', 'NEEDS_REVISION'];
  return canDeleteStory(userRole) && deletableStatuses.includes(status);
}

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const storyId = params.id as string;
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Fetch single story
  const { data: story, isLoading } = useStory(storyId);

  // Mutations
  const deleteStoryMutation = useDeleteStory();

  // Only compute this after story is defined
  const canSendForTranslation = !!session?.user?.staffRole && !!story && canUpdateStoryStatus(session.user.staffRole, story.status, 'PENDING_TRANSLATION');

  const handleSendForTranslation = () => {
    setShowTranslationModal(true);
  };

  const handleTranslationConfirm = async (translations: { language: string; translatorId: string }[]) => {
    setIsTranslating(true);
    try {
      // Create multiple Translation records for this story
      const response = await fetch(`/api/newsroom/translations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalStoryId: storyId,
          translations: translations.map(t => ({
            assignedToId: t.translatorId,
            targetLanguage: t.language,
          })),
        }),
      });
      if (!response.ok) {
        let errorMessage = 'Failed to send for translation';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          // If response.json() fails, use the status text as fallback
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      toast.success(`Story sent for translation to ${translations.length} language${translations.length > 1 ? 's' : ''}`);
      setShowTranslationModal(false);
      
      // Invalidate the story query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      
      // Redirect to translations page
      router.push('/newsroom/translations');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send for translation';
      toast.error(errorMessage);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_REVIEW' }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit story for review');
      }

      toast.success('Story submitted for review');
      router.push('/newsroom/stories');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit for review';
      toast.error(errorMessage);
    }
  };


  const handleDelete = async () => {
    // Check permissions before attempting delete
    if (!canDeleteStory(session?.user?.staffRole ?? null)) {
      toast.error('You do not have permission to delete stories');
      return;
    }

    setShowDeleteModal(false);
    setIsDeleting(true);
    try {
      await deleteStoryMutation.mutateAsync(storyId);
      toast.success('Story deleted successfully');
      router.push('/newsroom/stories');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete story';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
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



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <p className="text-red-600">Error loading story: Story not found</p>
          <Button href="/newsroom/stories" className="mt-4">
            Back to Stories
          </Button>
        </div>
      </Container>
    );
  }

  // Only render the main page content if story is defined
  return (
    <Container>
      <PageHeader
        title={story.title}
        description={
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
              <Badge color={statusColors[story.status as keyof typeof statusColors] || 'zinc'}>
                {story.status.replace('_', ' ')}
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
            {/* Back to Stories */}
            <Button
              color="white"
              onClick={() => router.push('/newsroom/stories')}
            >
              ← Back to Stories
            </Button>

            {/* Basic Actions */}
            <div className="flex items-center space-x-2">
              {/* Edit Button - Only show if user can edit this story and status is editable */}
              {canShowEditButton(session?.user?.staffRole ?? null, story.authorId, session?.user?.id || '', story.status) ? (
                <Button 
                  color="secondary" 
                  onClick={() => router.push(`/newsroom/stories/${story.id}/edit`)}
                >
                  <PencilSquareIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                // Show lock reason only if user is the author and story is locked
                (session?.user?.staffRole && story.authorId === session?.user?.id && getEditLockReason(story.status)) && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <PencilSquareIcon className="h-4 w-4" />
                    <span>{getEditLockReason(story.status)}</span>
                  </div>
                )
              )}

              {/* Delete Button - Only show if user can delete stories and status is deletable */}
              {canShowDeleteButton(session?.user?.staffRole ?? null, story.status) && (
                <Button
                  color="red"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>

            {/* Workflow Actions - Visual separator with border */}
            <div className="flex items-center space-x-2 pl-3 border-l border-gray-300">
              {/* Submit for Review - Interns only, DRAFT stories */}
              {canShowSubmitForReviewButton(session?.user?.staffRole ?? null, story.status, story.authorId, session?.user?.id ?? null) && (
                <Button
                  color="primary"
                  onClick={handleSubmitForReview}
                >
                  <ArrowUpCircleIcon className="h-4 w-4 mr-2" />
                  Submit for Review
                </Button>
              )}

              {/* Request Revision */}
              {canShowRequestRevisionButton(session?.user?.staffRole ?? null, story.status, story.authorId === session?.user?.id) && (
                <Button
                  color="secondary"
                  onClick={() => {
                    // For now, redirect to review page for revision functionality
                    router.push(`/newsroom/stories/${storyId}/review`);
                  }}
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  Request Revision
                </Button>
              )}

              {/* Final Review */}
              {canShowFinalReviewButton(session?.user?.staffRole ?? null, story.status, story.authorId === session?.user?.id) && (
                <Button
                  color="primary"
                  onClick={() => router.push(`/newsroom/stories/${storyId}/review`)}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Final Review
                </Button>
              )}

              {/* Send for Translation Button - Only for APPROVED status and with permission */}
              {story.status === 'APPROVED' && canSendForTranslation && (
                <Button
                  color="secondary"
                  onClick={handleSendForTranslation}
                  disabled={isTranslating}
                >
                  {isTranslating ? 'Sending...' : 'Send for Translation'}
                </Button>
              )}

              {/* Review for Publishing Button - Only for READY_TO_PUBLISH status */}
              {story.status === 'READY_TO_PUBLISH' && session?.user?.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
                <Button
                  color="primary"
                  onClick={() => router.push(`/newsroom/stories/${storyId}/publish`)}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Review for Publishing
                </Button>
              )}
            </div>
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Story Content */}
          <Card className="p-6">
            <div className="max-w-full">
              <div 
                className="text-gray-900 leading-relaxed space-y-4 break-words overflow-wrap-anywhere hyphens-auto [&_pre]:whitespace-pre-wrap [&_pre]:font-sans [&_code]:font-sans [&_*]:break-words"
                style={{ 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal'
                }}
                dangerouslySetInnerHTML={{ __html: story.content }}
              />
            </div>
          </Card>

          {/* Audio Clips Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3}>Audio Clips</Heading>
              <Badge color="zinc">
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
                {story.audioClips.map((clip: AudioClip) => (
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Translation Unit - Show when story has translations or is in translation workflow */}
          <TranslationUnit
            storyStatus={story.status}
            translations={story.translationRequests || []}
          />

          {/* Category & Tags - Show for journalists and above */}
          {session?.user?.staffRole && ['JOURNALIST', 'SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
            <Card className="p-6">
              <Heading level={3} className="mb-4">Organization</Heading>
              
              <DescriptionList>
                <DescriptionTerm>Category</DescriptionTerm>
                <DescriptionDetails>
                  <div className="flex items-center space-x-2">
                    {/* Remove category color dot, just show name or fallback */}
                    {story.category ? (
                      <span>{story.category.name}</span>
                    ) : (
                      <span className="italic text-zinc-400">No category</span>
                    )}
                  </div>
                </DescriptionDetails>

                <DescriptionTerm>Language</DescriptionTerm>
                <DescriptionDetails>
                  <Badge color="blue">
                    {story.language}
                  </Badge>
                </DescriptionDetails>

                {story.tags && story.tags.length > 0 && (
                  <>
                    <DescriptionTerm>Tags</DescriptionTerm>
                    <DescriptionDetails>
                      <div className="flex flex-wrap gap-1">
                        {story.tags.map((storyTag: { tag: { id: string; name: string } }) => (
                          <Badge 
                            key={storyTag.tag.id} 
                            color="zinc"
                          >
                            {storyTag.tag.name}
                          </Badge>
                        ))}
                      </div>
                    </DescriptionDetails>
                  </>
                )}
              </DescriptionList>
            </Card>
          )}

          {/* Published Date (if published) */}
          {story.publishedAt && (
            <Card className="p-6">
              <Heading level={3} className="mb-4">Publication</Heading>
              
              <DescriptionList>
                <DescriptionTerm>Published</DescriptionTerm>
                <DescriptionDetails>
                  {formatDate(story.publishedAt)}
                </DescriptionDetails>
              </DescriptionList>
            </Card>
          )}
        </div>
      </div>


      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle>Delete Story</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this story? This action cannot be undone.
        </DialogDescription>
        <DialogActions>
          <Button color="white" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete} disabled={isDeleting} className="font-bold flex items-center gap-2">
            <TrashIcon className="h-5 w-5 text-red-600" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Translation Selection Modal */}
      <TranslationSelectionModal
        isOpen={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
        onConfirm={handleTranslationConfirm}
        storyTitle={story.title}
        isLoading={isTranslating}
      />

    </Container>
  );
}