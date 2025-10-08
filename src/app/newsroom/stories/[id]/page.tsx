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
  GlobeAltIcon,
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
import { Field, Label, Description } from '@/components/ui/fieldset';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { Dialog, DialogTitle, DialogDescription, DialogActions } from '@/components/ui/dialog';

import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { TranslationSelectionModal } from '@/components/newsroom/TranslationSelectionModal';
import { StageTransitionModal } from '@/components/ui/stage-transition-modal';
import { ReviewStatusBanner } from '@/components/ui/review-status-banner';
import { StageProgress } from '@/components/ui/stage-progress';
import { CategoryModal } from '@/components/newsroom/CategoryModal';
import { TagModal } from '@/components/newsroom/TagModal';

import { useStory, useDeleteStory } from '@/hooks/use-stories';
import { useCategories } from '@/hooks/use-categories';
import { useTags } from '@/hooks/use-tags';
import {
  canEditStory,
  canEditStoryByStage,
  canDeleteStory,
  getEditLockReason,
  getStageLockReason,
  canUpdateStoryStatus
} from '@/lib/permissions';
import { StaffRole, StoryStatus, StoryStage, AudioClip } from '@prisma/client';
import { StageBadge } from '@/components/ui/stage-badge';
import { RevisionRequestBanner } from '@/components/ui/revision-request-banner';
import { useQuery } from '@tanstack/react-query';

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

// Helper: should show edit button (stage-based)
function canShowEditButton(
  userRole: StaffRole | null,
  authorId: string,
  userId: string | null,
  stage: StoryStage | null,
  assignedReviewerId?: string | null,
  assignedApproverId?: string | null,
  isTranslation?: boolean
) {
  // Use the stage-based permissions system
  return canEditStoryByStage(userRole, stage, authorId, userId ?? '', assignedReviewerId, assignedApproverId, isTranslation);
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
  const [showStageTransitionModal, setShowStageTransitionModal] = useState(false);
  const [stageTransitionAction, setStageTransitionAction] = useState<string | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);

  // Metadata editing state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metadataCategoryId, setMetadataCategoryId] = useState<string | null>(null);
  const [metadataTagIds, setMetadataTagIds] = useState<string[]>([]);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Modal visibility state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showReligionModal, setShowReligionModal] = useState(false);
  const [showOptionalTagsModal, setShowOptionalTagsModal] = useState(false);

  // Fetch single story
  const { data: story, isLoading } = useStory(storyId);

  // Fetch categories and tags for modals
  const { data: categoriesData } = useCategories(true); // flat=true to get all categories including nested
  const { data: tagsData } = useTags(undefined, undefined, undefined, 200);

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

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const response = await fetch('/api/users?perPage=100&userType=STAFF');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Fetch translations of this story (if this is an original story)
  const { data: translationsData } = useQuery({
    queryKey: ['storyTranslations', storyId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/stories?originalStoryId=${storyId}`);
      if (!response.ok) throw new Error('Failed to fetch translations');
      return response.json();
    },
    enabled: !!story && !story.isTranslation,
  });

  const unresolvedRevisions = revisionRequestsData?.revisionRequests?.filter(
    (r: any) => !r.resolvedAt
  ) || [];

  const users = usersData?.users || [];

  // Prepare data for modals
  const allCategories = categoriesData?.categories || [];
  const allTags = tagsData?.tags || [];

  // Filter tags by category
  const languageTags = allTags.filter((tag: any) => tag.category === 'LANGUAGE');
  const religionTags = allTags.filter((tag: any) => tag.category === 'RELIGION');
  const optionalTags = allTags.filter((tag: any) => tag.category === 'LOCALITY' || tag.category === 'GENERAL');

  // Mutations
  const deleteStoryMutation = useDeleteStory();

  // Only compute this after story is defined
  const canSendForTranslation = !!session?.user?.staffRole && !!story && canUpdateStoryStatus(session.user.staffRole, story.status, 'PENDING_TRANSLATION');

  // Determine next stage action based on current stage and user role
  const getNextStageAction = () => {
    if (!story || !session?.user?.staffRole || !story.stage) return null;

    const userRole = session.user.staffRole as StaffRole;
    const stage = story.stage as StoryStage;
    const isAuthor = story.authorId === session.user.id;

    // DRAFT -> Submit for Review (Intern only)
    if (stage === 'DRAFT' && userRole === 'INTERN' && isAuthor) {
      return {
        action: 'submit_for_review',
        label: 'Submit for Review',
        icon: ArrowUpCircleIcon,
        color: 'primary' as const,
        requiresAssignment: true,
        assignmentLabel: 'Assign Journalist Reviewer',
        assignmentRoles: ['JOURNALIST' as StaffRole],
      };
    }

    // DRAFT -> Send for Approval (Journalist only)
    if (stage === 'DRAFT' && userRole === 'JOURNALIST' && isAuthor) {
      return {
        action: 'send_for_approval',
        label: 'Send for Approval',
        icon: ArrowUpCircleIcon,
        color: 'primary' as const,
        requiresAssignment: true,
        assignmentLabel: 'Assign Sub-Editor for Approval',
        assignmentRoles: ['SUB_EDITOR' as StaffRole],
      };
    }

    // DRAFT -> Approve Story (Sub-Editor and above can self-approve)
    if (stage === 'DRAFT' && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole) && isAuthor) {
      return {
        action: 'approve_story',
        label: 'Approve Story',
        icon: CheckCircleIcon,
        color: 'primary' as const,
        requiresAssignment: false,
      };
    }

    // NEEDS_JOURNALIST_REVIEW -> Send for Approval or Request Revision (Journalist reviewing)
    if (stage === 'NEEDS_JOURNALIST_REVIEW' && userRole === 'JOURNALIST' && !isAuthor) {
      return {
        action: 'send_for_approval',
        label: 'Send for Approval',
        icon: CheckCircleIcon,
        color: 'primary' as const,
        requiresAssignment: true,
        assignmentLabel: 'Assign Sub-Editor for Approval',
        assignmentRoles: ['SUB_EDITOR' as StaffRole],
      };
    }

    // NEEDS_SUB_EDITOR_APPROVAL -> Approve or Request Revision (Sub-Editor)
    if (stage === 'NEEDS_SUB_EDITOR_APPROVAL' && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
      return {
        action: 'approve_story',
        label: 'Approve Story',
        icon: CheckCircleIcon,
        color: 'primary' as const,
        requiresAssignment: false,
      };
    }

    // TRANSLATED -> Publish Story (Sub-Editor and above)
    if (stage === 'TRANSLATED' && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
      return {
        action: 'publish_story',
        label: 'Publish Story',
        icon: CheckCircleIcon,
        color: 'primary' as const,
        requiresAssignment: false,
      };
    }

    return null;
  };

  const nextAction = getNextStageAction();

  // Determine if user can request revision
  const canRequestRevision = () => {
    if (!story || !session?.user?.staffRole || !story.stage) return false;

    const userRole = session.user.staffRole as StaffRole;
    const stage = story.stage as StoryStage;
    const isAuthor = story.authorId === session.user.id;

    // Journalist can request revision when reviewing intern's work
    if (stage === 'NEEDS_JOURNALIST_REVIEW' && userRole === 'JOURNALIST' && !isAuthor) {
      return true;
    }

    // Sub-Editor can request revision when approving
    if (stage === 'NEEDS_SUB_EDITOR_APPROVAL' && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
      return true;
    }

    return false;
  };

  const showRevisionButton = canRequestRevision();

  const handleSendForTranslation = () => {
    setShowTranslationModal(true);
  };

  const handleTranslationConfirm = async (translations: { language: string; translatorId: string }[]) => {
    setIsTranslating(true);
    try {
      // Create translation Story records using new simple API
      const response = await fetch(`/api/newsroom/stories/${storyId}/create-translations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translations: translations.map(t => ({
            language: t.language,
            assignedToId: t.translatorId,
          })),
        }),
      });
      if (!response.ok) {
        let errorMessage = 'Failed to create translations';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      toast.success(`Created ${translations.length} translation${translations.length > 1 ? 's' : ''} successfully`);
      setShowTranslationModal(false);

      // Invalidate the story query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
      await queryClient.invalidateQueries({ queryKey: ['storyTranslations', storyId] });

      // Redirect to story detail page to see the translations
      router.push(`/newsroom/stories/${storyId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create translations';
      toast.error(errorMessage);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleStageTransition = async (data: any) => {
    if (!nextAction) return;

    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: nextAction.action,
          assignedUserId: data.assignedUserId,
          checklistData: data.checklistData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transition story stage');
      }

      toast.success(`Story ${nextAction.label.toLowerCase()} successfully`);
      setShowStageTransitionModal(false);

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      await queryClient.invalidateQueries({ queryKey: ['stories'] });

      // Redirect to stories list
      router.push('/newsroom/stories');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to transition stage';
      toast.error(errorMessage);
    }
  };

  const handleRevisionRequest = async (data: any) => {
    if (!data.assignedUserId || !data.reason) {
      toast.error('Please assign a user and provide a reason for revision');
      return;
    }

    setIsRequestingRevision(true);
    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToId: data.assignedUserId,
          reason: data.reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request revision');
      }

      toast.success('Revision requested successfully');
      setShowRevisionModal(false);

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
      await queryClient.invalidateQueries({ queryKey: ['revisionRequests', storyId] });

      // Redirect to stories list
      router.push('/newsroom/stories');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request revision';
      toast.error(errorMessage);
    } finally {
      setIsRequestingRevision(false);
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

  // Initialize metadata when story loads or when editing starts
  const handleStartEditingMetadata = () => {
    if (story) {
      setMetadataCategoryId(story.categoryId);
      setMetadataTagIds(story.tags?.map((st: any) => st.tag.id) || []);
      setIsEditingMetadata(true);
    }
  };

  const handleCancelEditingMetadata = () => {
    setIsEditingMetadata(false);
    setMetadataCategoryId(story?.categoryId || null);
    setMetadataTagIds(story?.tags?.map((st: any) => st.tag.id) || []);
  };

  // Modal handlers
  const handleCategorySelected = (categoryId: string) => {
    setMetadataCategoryId(categoryId);
    setShowCategoryModal(false);
  };

  const handleLanguageSelected = (tagIds: string[]) => {
    // Replace language tags while keeping others
    const nonLanguageTags = metadataTagIds.filter((id) => {
      const tag = allTags.find((t: any) => t.id === id);
      return tag?.category !== 'LANGUAGE';
    });
    setMetadataTagIds([...nonLanguageTags, ...tagIds]);
    setShowLanguageModal(false);
  };

  const handleReligionSelected = (tagIds: string[]) => {
    // Replace religion tags while keeping others
    const nonReligionTags = metadataTagIds.filter((id) => {
      const tag = allTags.find((t: any) => t.id === id);
      return tag?.category !== 'RELIGION';
    });
    setMetadataTagIds([...nonReligionTags, ...tagIds]);
    setShowReligionModal(false);
  };

  const handleOptionalTagsSelected = (tagIds: string[]) => {
    // Replace optional tags while keeping required tags
    const requiredTags = metadataTagIds.filter((id) => {
      const tag = allTags.find((t: any) => t.id === id);
      return tag?.category === 'LANGUAGE' || tag?.category === 'RELIGION';
    });
    setMetadataTagIds([...requiredTags, ...tagIds]);
    setShowOptionalTagsModal(false);
  };

  const handleSaveMetadata = async () => {
    if (!story) return;

    setIsSavingMetadata(true);
    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: metadataCategoryId,
          tagIds: metadataTagIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update categorisation');
      }

      toast.success('Categorisation updated successfully!');
      setIsEditingMetadata(false);

      // Refetch story data
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update categorisation');
    } finally {
      setIsSavingMetadata(false);
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

  // Check if current user requested revision
  const userRequestedRevision = unresolvedRevisions.some(
    (r: any) => r.requestedById === session?.user?.id
  );

  // Only render the main page content if story is defined
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
       story.assignedReviewerId === session?.user?.id &&
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

      {/* Revision Request Banner - For Author */}
      {unresolvedRevisions.length > 0 && story.authorId === session?.user?.id && (
        <RevisionRequestBanner
          revisionRequests={unresolvedRevisions}
          className="mb-6"
        />
      )}

      {/* Revision Requested Banner - For Reviewer/Journalist */}
      {userRequestedRevision && story.stage === 'DRAFT' && story.authorId !== session?.user?.id && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Revision Requested
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                You requested revision from {story.author.firstName} {story.author.lastName}. They have been notified and can now make the necessary changes.
              </p>
              {unresolvedRevisions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {unresolvedRevisions
                    .filter((r: any) => r.requestedById === session?.user?.id)
                    .map((revision: any) => (
                      <div key={revision.id} className="rounded bg-blue-100 dark:bg-blue-900 p-3">
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Requested on {new Date(revision.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">{revision.reason}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Translation Assignment Banner */}
      {story.isTranslation && story.stage === 'DRAFT' && (!story.content || story.content.trim() === '') && (
        <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
          <div className="flex items-start gap-3">
            <GlobeAltIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                {story.authorId === session?.user?.id ? 'Translation Assignment' : 'Translation In Progress'}
              </h3>
              <p className="mt-1 text-sm text-purple-700 dark:text-purple-300">
                {story.authorId === session?.user?.id ? (
                  <>
                    You have been assigned to translate this story to <strong>{story.language}</strong>.
                    Click "Translate" to begin working on the translation.
                  </>
                ) : (
                  <>
                    This story has been assigned to <strong>{story.author.firstName} {story.author.lastName}</strong> for translation to <strong>{story.language}</strong>.
                    The translation is in progress.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stage Progress Bar */}
      {story.stage && story.author.staffRole && (
        <StageProgress
          currentStage={story.stage as StoryStage}
          authorRole={story.author.staffRole as StaffRole}
          className="mb-8"
        />
      )}

      <PageHeader
        title={
          story.isTranslation && (!story.content || story.content.trim() === '')
            ? `${story.title} (${story.language} - Translation Pending)`
            : story.title
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
              {/* Translate Button - For empty translation stories */}
              {story.isTranslation &&
               (!story.content || story.content.trim() === '') &&
               canShowEditButton(
                 session?.user?.staffRole ?? null,
                 story.authorId,
                 session?.user?.id || '',
                 story.stage,
                 story.assignedReviewerId,
                 story.assignedApproverId,
                 story.isTranslation
               ) && (
                <Button
                  color="primary"
                  onClick={() => router.push(`/newsroom/stories/${story.id}/translate`)}
                >
                  <GlobeAltIcon className="h-4 w-4 mr-2" />
                  Translate
                </Button>
              )}

              {/* Edit Button - For non-translations or translations with content */}
              {(!story.isTranslation || (story.content && story.content.trim() !== '')) &&
               canShowEditButton(
                 session?.user?.staffRole ?? null,
                 story.authorId,
                 session?.user?.id || '',
                 story.stage,
                 story.assignedReviewerId,
                 story.assignedApproverId,
                 story.isTranslation
               ) && (
                <Button
                  color="secondary"
                  onClick={() => router.push(`/newsroom/stories/${story.id}/edit`)}
                >
                  <PencilSquareIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
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
              {/* Request Revision Button */}
              {showRevisionButton && (
                <Button
                  color="secondary"
                  onClick={() => setShowRevisionModal(true)}
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  Request Revision
                </Button>
              )}

              {/* Next Stage Action Button */}
              {nextAction && (
                <Button
                  color={nextAction.color}
                  onClick={() => setShowStageTransitionModal(true)}
                >
                  <nextAction.icon className="h-4 w-4 mr-2" />
                  {nextAction.label}
                </Button>
              )}

              {/* Mark as Ready to Publish - For APPROVED stories with completed translations */}
              {story.stage === 'APPROVED' &&
               story.translations &&
               story.translations.length > 0 &&
               story.translations.every((t: any) => t.stage === 'APPROVED' || t.stage === 'TRANSLATED' || t.stage === 'PUBLISHED') &&
               session?.user?.staffRole &&
               ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
                <Button
                  color="primary"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/newsroom/stories/${storyId}/stage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'mark_as_translated',
                        }),
                      });

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to mark as ready to publish');
                      }

                      toast.success('Story marked as ready to publish');
                      await queryClient.invalidateQueries({ queryKey: ['story', storyId] });
                      await queryClient.invalidateQueries({ queryKey: ['stories'] });
                    } catch (error: unknown) {
                      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as ready to publish';
                      toast.error(errorMessage);
                    }
                  }}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Mark as Ready to Publish
                </Button>
              )}

              {/* Create Translation - For APPROVED original stories without any translations (one-time only) */}
              {!story.isTranslation &&
               story.stage === 'APPROVED' &&
               (!story.translations || story.translations.length === 0) &&
               (!translationsData?.stories || translationsData.stories.length === 0) &&
               session?.user?.staffRole &&
               ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
                <Button
                  color="secondary"
                  onClick={handleSendForTranslation}
                  disabled={isTranslating}
                >
                  {isTranslating ? 'Creating...' : 'Create Translation'}
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
              {story.isTranslation && (!story.content || story.content.trim() === '') ? (
                <div className="text-center py-12">
                  <GlobeAltIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Translation Not Yet Started
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    {story.authorId === session?.user?.id
                      ? 'This translation is waiting for you to add content. Click "Edit" above to begin translating.'
                      : `This translation is assigned to ${story.author.firstName} ${story.author.lastName} and has not yet been started.`
                    }
                  </p>
                </div>
              ) : (
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
              )}
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
          {/* Translation Info - Show if this is a translation */}
          {story.isTranslation && story.originalStoryId && (
            <Card className="p-6">
              <Heading level={3} className="mb-4">Translation Info</Heading>
              <DescriptionList>
                <DescriptionTerm>Original Story</DescriptionTerm>
                <DescriptionDetails>
                  <Button
                    color="white"
                    onClick={() => router.push(`/newsroom/stories/${story.originalStoryId}`)}
                    className="text-sm"
                  >
                    View Original Story
                  </Button>
                </DescriptionDetails>
                <DescriptionTerm>Language</DescriptionTerm>
                <DescriptionDetails>
                  <Badge color="blue">{story.language}</Badge>
                </DescriptionDetails>
              </DescriptionList>
            </Card>
          )}

          {/* Translations List - Show translations of this story */}
          {!story.isTranslation && translationsData?.stories && translationsData.stories.length > 0 && (
            <Card className="p-6">
              <Heading level={3} className="mb-4">Translations</Heading>
              <div className="space-y-2">
                {translationsData.stories.map((translation: any) => (
                  <div
                    key={translation.id}
                    className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    onClick={() => router.push(`/newsroom/stories/${translation.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge color="blue">{translation.language}</Badge>
                        <StageBadge stage={translation.stage} />
                      </div>
                      <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        by {translation.author.firstName} {translation.author.lastName}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Story Categorisation - Show for sub-editors and above (editable) */}
          {session?.user?.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
            <Card className="p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <Heading level={3}>Story Categorisation</Heading>
                  {!isEditingMetadata && (
                    <Button
                      color="white"
                      onClick={handleStartEditingMetadata}
                      className="text-sm"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              {isEditingMetadata ? (
                <div className="space-y-4">
                  {/* Category Selection */}
                  <Field>
                    <Label>Category <span className="text-red-500">*</span></Label>
                    <Description>Category is required before story can be approved</Description>
                    <div className="mt-2 space-y-2">
                      <Button
                        color="white"
                        onClick={() => setShowCategoryModal(true)}
                        className="w-full justify-start"
                      >
                        {metadataCategoryId ? (
                          <span>
                            {allCategories.find((c: any) => c.id === metadataCategoryId)?.name || 'Select Category'}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Select Category</span>
                        )}
                      </Button>
                      {metadataCategoryId && (
                        <div className="bg-kelly-green/10 p-2 rounded border border-kelly-green/20">
                          <Text className="text-sm text-kelly-green/80">
                            <strong>Selected:</strong> {allCategories.find((c: any) => c.id === metadataCategoryId)?.name}
                          </Text>
                        </div>
                      )}
                    </div>
                  </Field>

                  {/* Language Selection */}
                  <Field>
                    <Label>Language <span className="text-red-500">*</span></Label>
                    <Description>Language tag is required before story can be approved</Description>
                    <div className="mt-2 space-y-2">
                      <Button
                        color="white"
                        onClick={() => setShowLanguageModal(true)}
                        className="w-full justify-start"
                      >
                        {metadataTagIds.filter(id => allTags.find((t: any) => t.id === id && t.category === 'LANGUAGE')).length > 0 ? (
                          <span>
                            {allTags.find((t: any) => metadataTagIds.includes(t.id) && t.category === 'LANGUAGE')?.name || 'Select Language'}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Select Language</span>
                        )}
                      </Button>
                      {metadataTagIds.filter(id => allTags.find((t: any) => t.id === id && t.category === 'LANGUAGE')).length > 0 && (
                        <div className="bg-kelly-green/10 p-2 rounded border border-kelly-green/20">
                          <Text className="text-sm text-kelly-green/80">
                            <strong>Selected:</strong> {allTags.find((t: any) => metadataTagIds.includes(t.id) && t.category === 'LANGUAGE')?.name}
                          </Text>
                        </div>
                      )}
                    </div>
                  </Field>

                  {/* Religion Selection */}
                  <Field>
                    <Label>Religion <span className="text-red-500">*</span></Label>
                    <Description>Religion tag is required before story can be approved</Description>
                    <div className="mt-2 space-y-2">
                      <Button
                        color="white"
                        onClick={() => setShowReligionModal(true)}
                        className="w-full justify-start"
                      >
                        {metadataTagIds.filter(id => allTags.find((t: any) => t.id === id && t.category === 'RELIGION')).length > 0 ? (
                          <span>
                            {allTags.find((t: any) => metadataTagIds.includes(t.id) && t.category === 'RELIGION')?.name || 'Select Religion'}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Select Religion</span>
                        )}
                      </Button>
                      {metadataTagIds.filter(id => allTags.find((t: any) => t.id === id && t.category === 'RELIGION')).length > 0 && (
                        <div className="bg-kelly-green/10 p-2 rounded border border-kelly-green/20">
                          <Text className="text-sm text-kelly-green/80">
                            <strong>Selected:</strong> {allTags.find((t: any) => metadataTagIds.includes(t.id) && t.category === 'RELIGION')?.name}
                          </Text>
                        </div>
                      )}
                    </div>
                  </Field>

                  {/* Optional Tags Selection */}
                  <Field>
                    <Label>Additional Tags</Label>
                    <Description>Optional tags for locality and general categorization</Description>
                    <div className="mt-2 space-y-2">
                      <Button
                        color="white"
                        onClick={() => setShowOptionalTagsModal(true)}
                        className="w-full justify-start"
                      >
                        {metadataTagIds.filter(id => {
                          const tag = allTags.find((t: any) => t.id === id);
                          return tag && (tag.category === 'LOCALITY' || tag.category === 'GENERAL');
                        }).length > 0 ? (
                          <span>
                            {metadataTagIds.filter(id => {
                              const tag = allTags.find((t: any) => t.id === id);
                              return tag && (tag.category === 'LOCALITY' || tag.category === 'GENERAL');
                            }).length} tags selected
                          </span>
                        ) : (
                          <span className="text-zinc-400">Select Optional Tags</span>
                        )}
                      </Button>
                      {metadataTagIds.filter(id => {
                        const tag = allTags.find((t: any) => t.id === id);
                        return tag && (tag.category === 'LOCALITY' || tag.category === 'GENERAL');
                      }).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {allTags
                            .filter((t: any) => metadataTagIds.includes(t.id) && (t.category === 'LOCALITY' || t.category === 'GENERAL'))
                            .map((tag: any) => (
                              <Badge key={tag.id} color="zinc">
                                {tag.name}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                  </Field>

                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button
                      color="white"
                      onClick={handleCancelEditingMetadata}
                      disabled={isSavingMetadata}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveMetadata}
                      disabled={isSavingMetadata}
                    >
                      {isSavingMetadata ? 'Saving...' : 'Save Categorisation'}
                    </Button>
                  </div>
                </div>
              ) : (
                <DescriptionList>
                  <DescriptionTerm>Category</DescriptionTerm>
                  <DescriptionDetails>
                    <div className="flex items-center space-x-2">
                      {story.category ? (
                        <span>{story.category.name}</span>
                      ) : (
                        <span className="italic text-zinc-400">No category assigned</span>
                      )}
                    </div>
                  </DescriptionDetails>

                  <DescriptionTerm>Language</DescriptionTerm>
                  <DescriptionDetails>
                    {story.tags?.some((st: any) => st.tag.category === 'LANGUAGE') ? (
                      <div className="flex flex-wrap gap-1">
                        {story.tags
                          .filter((st: any) => st.tag.category === 'LANGUAGE')
                          .map((storyTag: any) => (
                            <Badge key={storyTag.tag.id} color="blue">
                              {storyTag.tag.name}
                            </Badge>
                          ))}
                      </div>
                    ) : (
                      <span className="italic text-zinc-400">No language assigned</span>
                    )}
                  </DescriptionDetails>

                  <DescriptionTerm>Religion</DescriptionTerm>
                  <DescriptionDetails>
                    {story.tags?.some((st: any) => st.tag.category === 'RELIGION') ? (
                      <div className="flex flex-wrap gap-1">
                        {story.tags
                          .filter((st: any) => st.tag.category === 'RELIGION')
                          .map((storyTag: any) => (
                            <Badge key={storyTag.tag.id} color="purple">
                              {storyTag.tag.name}
                            </Badge>
                          ))}
                      </div>
                    ) : (
                      <span className="italic text-zinc-400">No religion assigned</span>
                    )}
                  </DescriptionDetails>

                  {story.tags?.some((st: any) => st.tag.category === 'LOCALITY' || st.tag.category === 'GENERAL') && (
                    <>
                      <DescriptionTerm>Additional Tags</DescriptionTerm>
                      <DescriptionDetails>
                        <div className="flex flex-wrap gap-1">
                          {story.tags
                            .filter((st: any) => st.tag.category === 'LOCALITY' || st.tag.category === 'GENERAL')
                            .map((storyTag: any) => (
                              <Badge key={storyTag.tag.id} color="zinc">
                                {storyTag.tag.name}
                              </Badge>
                            ))}
                        </div>
                      </DescriptionDetails>
                    </>
                  )}
                </DescriptionList>
              )}

              {/* Validation warnings */}
              {!isEditingMetadata && story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' && (
                <div className="mt-4 space-y-2">
                  {!story.categoryId && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span>Category required for approval</span>
                    </div>
                  )}
                  {!story.tags?.some((st: any) => st.tag.category === 'LANGUAGE') && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span>Language tag required for approval</span>
                    </div>
                  )}
                  {!story.tags?.some((st: any) => st.tag.category === 'RELIGION') && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span>Religion tag required for approval</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Read-only organization view for journalists */}
          {session?.user?.staffRole === 'JOURNALIST' && (
            <Card className="p-6">
              <Heading level={3} className="mb-4">Organization</Heading>

              <DescriptionList>
                <DescriptionTerm>Category</DescriptionTerm>
                <DescriptionDetails>
                  {story.category ? (
                    <span>{story.category.name}</span>
                  ) : (
                    <span className="italic text-zinc-400">No category</span>
                  )}
                </DescriptionDetails>

                {story.tags && story.tags.length > 0 && (
                  <>
                    <DescriptionTerm>Tags</DescriptionTerm>
                    <DescriptionDetails>
                      <div className="flex flex-wrap gap-1">
                        {story.tags.map((storyTag: { tag: { id: string; name: string; category: string } }) => (
                          <Badge
                            key={storyTag.tag.id}
                            color={storyTag.tag.category === 'LANGUAGE' ? 'blue' : storyTag.tag.category === 'RELIGION' ? 'purple' : 'zinc'}
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

      {/* Category Selection Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onConfirm={handleCategorySelected}
        categories={allCategories}
        selectedCategoryId={metadataCategoryId || undefined}
        isLoading={isSavingMetadata}
        filterEditable={false}
      />

      {/* Language Tag Selection Modal */}
      <TagModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onConfirm={handleLanguageSelected}
        tags={languageTags}
        selectedTagIds={metadataTagIds.filter(id => allTags.find((t: any) => t.id === id && t.category === 'LANGUAGE'))}
        title="Select Language"
        description="Choose the language for this story. This is required before the story can be approved."
        required
        singleSelect
        showSearch={false}
        isLoading={isSavingMetadata}
      />

      {/* Religion Tag Selection Modal */}
      <TagModal
        isOpen={showReligionModal}
        onClose={() => setShowReligionModal(false)}
        onConfirm={handleReligionSelected}
        tags={religionTags}
        selectedTagIds={metadataTagIds.filter(id => allTags.find((t: any) => t.id === id && t.category === 'RELIGION'))}
        title="Select Religion"
        description="Choose the religious perspective for this story. This is required before the story can be approved."
        required
        singleSelect
        showSearch={false}
        isLoading={isSavingMetadata}
      />

      {/* Optional Tags Selection Modal */}
      <TagModal
        isOpen={showOptionalTagsModal}
        onClose={() => setShowOptionalTagsModal(false)}
        onConfirm={handleOptionalTagsSelected}
        tags={optionalTags}
        selectedTagIds={metadataTagIds.filter(id => {
          const tag = allTags.find((t: any) => t.id === id);
          return tag && (tag.category === 'LOCALITY' || tag.category === 'GENERAL');
        })}
        title="Select Additional Tags"
        description="Choose optional tags for locality and general categorization."
        showSearch
        isLoading={isSavingMetadata}
      />

      {/* Stage Transition Modal */}
      {nextAction && (
        <StageTransitionModal
          isOpen={showStageTransitionModal}
          onClose={() => setShowStageTransitionModal(false)}
          onSubmit={handleStageTransition}
          title={nextAction.label}
          description={`Complete the checklist below to ${nextAction.label.toLowerCase()}.`}
          actionLabel={nextAction.label}
          actionColor={nextAction.color}
          requiresAssignment={nextAction.requiresAssignment}
          assignmentLabel={nextAction.assignmentLabel}
          assignmentRoles={nextAction.assignmentRoles}
          users={users}
          checklistItems={
            nextAction.action === 'publish_story'
              ? [
                  { id: 'content', label: 'Final content review complete', checked: false, required: true },
                  { id: 'translations', label: 'All translations verified and complete', checked: false, required: true },
                  { id: 'audio', label: 'Audio quality checked', checked: false, required: true },
                  { id: 'metadata', label: 'Categorization and tags verified', checked: false, required: true },
                ]
              : [
                  { id: 'content', label: 'Content is complete and accurate', checked: false, required: true },
                  { id: 'grammar', label: 'Grammar and spelling checked', checked: false, required: true },
                  { id: 'sources', label: 'Sources verified', checked: false, required: true },
                ]
          }
        />
      )}

      {/* Revision Request Modal */}
      <Dialog open={showRevisionModal} onClose={() => setShowRevisionModal(false)}>
        <DialogTitle>Request Revision</DialogTitle>
        <DialogDescription>
          Provide feedback and assign this story back to a team member for revision.
        </DialogDescription>

        <div className="mt-4 space-y-4">
          {/* Assignment Select */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Assign to: <span className="text-red-600">*</span>
            </label>
            <select
              id="revisionAssignee"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              defaultValue=""
            >
              <option value="">Select user...</option>
              {users
                .filter((u: any) => {
                  // If sub-editor is reviewing, send back to the journalist who submitted it
                  if (story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' && story.assignedReviewerId) {
                    return u.id === story.assignedReviewerId;
                  }
                  // Otherwise, send back to the original author (intern for journalist review)
                  return u.id === story?.authorId;
                })
                .map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.staffRole})
                  </option>
                ))}
            </select>
          </div>

          {/* Reason Textarea */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Reason for revision: <span className="text-red-600">*</span>
            </label>
            <textarea
              id="revisionReason"
              rows={4}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Explain what needs to be revised..."
            />
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Minimum 10 characters required
            </p>
          </div>
        </div>

        <DialogActions>
          <Button color="white" onClick={() => setShowRevisionModal(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              const assignee = (document.getElementById('revisionAssignee') as HTMLSelectElement)?.value;
              const reason = (document.getElementById('revisionReason') as HTMLTextAreaElement)?.value;
              handleRevisionRequest({ assignedUserId: assignee, reason });
            }}
            disabled={isRequestingRevision}
          >
            {isRequestingRevision ? 'Requesting...' : 'Request Revision'}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}