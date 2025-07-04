'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  PencilSquareIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
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
import { Text } from '@/components/ui/text';
import { Divider } from '@/components/ui/divider';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { CommentForm } from '@/components/ui/comment-form';
import { CommentList } from '@/components/ui/comment-list';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { ReviewerSelectionModal } from '@/components/admin/ReviewerSelectionModal';
import { SubEditorSelectionModal } from '@/components/admin/SubEditorSelectionModal';

import { useStory, useUpdateStoryStatus, useDeleteStory } from '@/hooks/use-stories';
import { StoryStatus } from '@prisma/client';
import { 
  canUpdateStoryStatus, 
  canEditStory, 
  canDeleteStory, 
  canApproveStory, 
  canPublishStory,
  getAvailableStatusTransitions,
  getEditLockReason
} from '@/lib/permissions';

// Status badge colors
const statusColors = {
  DRAFT: 'zinc',
  IN_REVIEW: 'amber',
  NEEDS_REVISION: 'red',
  PENDING_APPROVAL: 'blue',
  APPROVED: 'lime',
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

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const storyId = params.id as string;
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [showSubEditorModal, setShowSubEditorModal] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<StoryStatus | null>(null);

  // Check if user is an intern
  const isIntern = session?.user?.staffRole === 'INTERN';

  // Fetch single story
  const { data: story, isLoading, error } = useStory(storyId);
  
  // Mutations
  const updateStoryStatusMutation = useUpdateStoryStatus();
  const deleteStoryMutation = useDeleteStory();

  const handleStatusUpdate = async (newStatus: StoryStatus) => {
    // Check permissions before attempting update
    if (!canUpdateStoryStatus(session?.user?.staffRole, story?.status || 'DRAFT', newStatus, story?.authorId, session?.user?.id)) {
      toast.error('You do not have permission to perform this action');
      return;
    }
    
    // If submitting for review, show the reviewer selection modal
    if (newStatus === 'IN_REVIEW') {
      setPendingStatusUpdate(newStatus);
      setShowReviewerModal(true);
      return;
    }
    
    // If submitting for approval, show the sub-editor selection modal
    if (newStatus === 'PENDING_APPROVAL') {
      setPendingStatusUpdate(newStatus);
      setShowSubEditorModal(true);
      return;
    }
    
    setIsUpdatingStatus(true);
    try {
      await updateStoryStatusMutation.mutateAsync({ 
        id: storyId, 
        data: { status: newStatus } 
      });
      toast.success('Story status updated successfully');
    } catch (error) {
      toast.error('Failed to update story status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    // Check permissions before attempting delete
    if (!canDeleteStory(session?.user?.staffRole)) {
      toast.error('You do not have permission to delete stories');
      return;
    }

    if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteStoryMutation.mutateAsync(storyId);
      toast.success('Story deleted successfully');
      router.push('/admin/newsroom/stories');
    } catch (error) {
      toast.error('Failed to delete story');
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

  const handleCommentAdded = () => {
    setCommentsRefreshKey(prev => prev + 1);
  };

  const handleReviewerSelected = async (reviewerId: string) => {
    if (!pendingStatusUpdate) return;
    
    setIsUpdatingStatus(true);
    setShowReviewerModal(false);
    
    try {
      await updateStoryStatusMutation.mutateAsync({ 
        id: storyId, 
        data: { 
          status: pendingStatusUpdate,
          reviewerId: reviewerId 
        } 
      });
      toast.success('Story submitted for review successfully');
      setPendingStatusUpdate(null);
    } catch (error) {
      toast.error('Failed to submit story for review');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSubEditorSelected = async (subEditorId: string) => {
    if (!pendingStatusUpdate) return;
    
    setIsUpdatingStatus(true);
    setShowSubEditorModal(false);
    
    try {
      await updateStoryStatusMutation.mutateAsync({ 
        id: storyId, 
        data: { 
          status: pendingStatusUpdate,
          assignedToId: subEditorId 
        } 
      });
      toast.success('Story submitted for approval successfully');
      setPendingStatusUpdate(null);
    } catch (error) {
      toast.error('Failed to submit story for approval');
    } finally {
      setIsUpdatingStatus(false);
    }
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
            icon: EyeIcon,
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
                icon: CheckCircleIcon,
              });
            } else {
              // Journalists submit intern stories for sub-editor approval
              actions.push({
                label: 'Submit for Approval',
                status: newStatus,
                color: 'emerald' as const,
                icon: CheckCircleIcon,
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
              icon: CheckCircleIcon,
            });
          }
          break;
        case 'NEEDS_REVISION':
          actions.push({
            label: 'Request Revision',
            status: newStatus,
            color: 'red' as const,
            icon: XCircleIcon,
          });
          break;
        case 'PUBLISHED':
          if (canPublishStory(userRole)) {
            actions.push({
              label: 'Publish',
              status: newStatus,
              color: 'emerald' as const,
              icon: CheckCircleIcon,
            });
          }
          break;
      }
    });

    return actions;
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

  if (error || !story) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading story: {error?.message || 'Story not found'}</p>
          <Button asChild className="mt-4">
            <Link href="/admin/newsroom/stories">Back to Stories</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const statusActions = getStatusActions(story.status);

  return (
    <Container>
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
                color={action.color as any}
                size="sm"
                onClick={() => handleStatusUpdate(action.status)}
                disabled={isUpdatingStatus}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
            
            {/* Edit Button - Only show if user can edit this story */}
            {canEditStory(session?.user?.staffRole, story.authorId, session?.user?.id || '', story.status) ? (
              <Button size="sm" color="secondary" href={`/admin/newsroom/stories/${story.id}/edit`}>
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              // Show lock reason if user would normally be able to edit but story is locked
              (session?.user?.staffRole && story.authorId === session?.user?.id) && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <PencilSquareIcon className="h-4 w-4" />
                  <span>{getEditLockReason(story.status)}</span>
                </div>
              )
            )}

            {/* Delete Button - Only show if user can delete stories */}
            {canDeleteStory(session?.user?.staffRole) && (
              <Button
                size="sm"
                color="red"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <TrashIcon className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Comment Form */}
          <Card className="p-6">
            <Heading level={3} className="mb-4">Add Comment</Heading>
            <CommentForm storyId={storyId} onCommentAdded={handleCommentAdded} />
          </Card>

          {/* Comments List */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3}>Comments</Heading>
              <Badge color="gray" size="sm">
                {story._count?.comments || 0} comments
              </Badge>
            </div>
            
            <CommentList storyId={storyId} onCommentAdded={handleCommentAdded} />
          </Card>

          {/* Category & Tags - Only show for editors and admins */}
          {session?.user?.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
            <Card className="p-6">
              <Heading level={3} className="mb-4">Organization</Heading>
              
              <DescriptionList>
                <DescriptionTerm>Category</DescriptionTerm>
                <DescriptionDetails>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: story.category.color || '#6B7280' }}
                    />
                    <span>{story.category.name}</span>
                  </div>
                </DescriptionDetails>

                {story.tags && story.tags.length > 0 && (
                  <>
                    <DescriptionTerm>Tags</DescriptionTerm>
                    <DescriptionDetails>
                      <div className="flex flex-wrap gap-1">
                        {story.tags.map((storyTag: any) => (
                          <Badge 
                            key={storyTag.tag.id} 
                            color="gray" 
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

      {/* Reviewer Selection Modal */}
      <ReviewerSelectionModal
        isOpen={showReviewerModal}
        onClose={() => {
          setShowReviewerModal(false);
          setPendingStatusUpdate(null);
        }}
        onConfirm={handleReviewerSelected}
        storyTitle={story?.title || ''}
        isLoading={isUpdatingStatus}
      />

      {/* Sub-Editor Selection Modal */}
      <SubEditorSelectionModal
        isOpen={showSubEditorModal}
        onClose={() => {
          setShowSubEditorModal(false);
          setPendingStatusUpdate(null);
        }}
        onConfirm={handleSubEditorSelected}
        storyTitle={story?.title || ''}
        isLoading={isUpdatingStatus}
      />
    </Container>
  );
}