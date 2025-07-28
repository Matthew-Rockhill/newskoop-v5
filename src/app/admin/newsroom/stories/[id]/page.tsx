'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  MusicalNoteIcon,
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
import { TranslationSelectionModal } from '@/components/admin/TranslationSelectionModal';

import { useStory, useDeleteStory } from '@/hooks/use-stories';
import { 
  canEditStory, 
  canDeleteStory, 
  getEditLockReason,
  canUpdateStoryStatus
} from '@/lib/permissions';
import { StaffRole } from '@prisma/client';

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

// Helper: should show review button
function canShowReviewButton(userRole: StaffRole | null, status: string) {
  if (!userRole) return false;
  // Only show for sub-editor and above, and only for PENDING_APPROVAL
  return (
    ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole) &&
    status === 'PENDING_APPROVAL'
  );
}

// Helper: should show edit button
function canShowEditButton(userRole: StaffRole | null, authorId: string, userId: string | null, status: string) {
  // Only allow edit for DRAFT, IN_REVIEW, NEEDS_REVISION
  const editableStatuses = ['DRAFT', 'IN_REVIEW', 'NEEDS_REVISION'];
  return canEditStory(userRole, authorId, userId, status) && editableStatuses.includes(status);
}

// Helper: should show delete button
function canShowDeleteButton(userRole: StaffRole | null, status: string) {
  // Only allow delete for DRAFT, IN_REVIEW, NEEDS_REVISION
  const deletableStatuses = ['DRAFT', 'IN_REVIEW', 'NEEDS_REVISION'];
  return canDeleteStory(userRole) && deletableStatuses.includes(status);
}

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
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

  const handleTranslationConfirm = async ({ language, translatorId }: { language: string; translatorId: string }) => {
    setIsTranslating(true);
    try {
      // Create a Translation record for this story
      const response = await fetch(`/api/newsroom/translations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalStoryId: storyId,
          assignedToId: translatorId,
          targetLanguage: language,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send for translation');
      }
      toast.success('Story sent for translation');
      setShowTranslationModal(false);
      router.refresh?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send for translation';
      toast.error(errorMessage);
    } finally {
      setIsTranslating(false);
    }
  };


  const handleDelete = async () => {
    // Check permissions before attempting delete
    if (!canDeleteStory(session?.user?.staffRole)) {
      toast.error('You do not have permission to delete stories');
      return;
    }

    setShowDeleteModal(false);
    setIsDeleting(true);
    try {
      await deleteStoryMutation.mutateAsync(storyId);
      toast.success('Story deleted successfully');
      router.push('/admin/newsroom/stories');
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
          <Button href="/admin/newsroom/stories" className="mt-4">
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
              <Badge color={statusColors[story.status]}>
                {story.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Priority:</span>
              <Badge color={priorityColors[story.priority]}>
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
            {/* Back to Stories */}
            <Button
              color="white"
              onClick={() => router.push('/admin/newsroom/stories')}
            >
              ← Back to Stories
            </Button>

            {/* Review Button for Sub-Editors - Only for PENDING_APPROVAL */}
            {canShowReviewButton(session?.user?.staffRole, story.status) && (
              <Button
                color="primary"
                onClick={() => router.push(`/admin/newsroom/stories/${storyId}/review`)}
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                Review Story
              </Button>
            )}

            {/* Edit Button - Only show if user can edit this story and status is editable */}
            {canShowEditButton(session?.user?.staffRole, story.authorId, session?.user?.id || '', story.status) ? (
              <Button 
                color="secondary" 
                onClick={() => router.push(`/admin/newsroom/stories/${story.id}/edit`)}
              >
                <PencilSquareIcon className="h-4 w-4 mr-2" />
                Edit Story
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
            {canShowDeleteButton(session?.user?.staffRole, story.status) && (
              <Button
                color="red"
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}

            {/* Send for Translation Button - Only for APPROVED status and with permission */}
            {story.status === 'APPROVED' && canSendForTranslation && (
              <Button
                size="sm"
                color="purple"
                onClick={handleSendForTranslation}
                disabled={isTranslating}
              >
                {isTranslating ? 'Sending...' : 'Send for Translation'}
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Story Content */}
          <Card className="p-6">
            <div className="prose max-w-none">
              <div 
                className="text-gray-900 leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: story.content }}
              />
            </div>
          </Card>

          {/* Audio Clips Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3}>Audio Clips</Heading>
              <Badge color="zinc" size="sm">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

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
                  <Badge color="blue" size="sm">
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
                            size="sm"
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

      {/* Associated Translations Section */}
      {story.translations && story.translations.length > 0 && (
        <div className="mt-8">
          <Card className="p-6">
            <Heading level={3} className="mb-4">Associated Translations</Heading>
            <div className="space-y-3">
              {story.translations.map((translation: { id: string; title: string; language: string; status: string; assignedTo: { firstName: string; lastName: string } }) => (
                <div key={translation.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{translation.title}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Badge color="purple">{translation.language || translation.targetLanguage}</Badge>
                      <Badge color={translation.status === 'APPROVED' ? 'green' : 'amber'}>{translation.status}</Badge>
                      {translation.assignedTo && (
                        <span>• Translator: {translation.assignedTo.firstName} {translation.assignedTo.lastName}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    color="white"
                    onClick={() => router.push(`/admin/newsroom/translations/${translation.id}/work`)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

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