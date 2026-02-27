'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PencilSquareIcon,
  TrashIcon,
  MusicalNoteIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpCircleIcon,
  GlobeAltIcon,
  ChevronRightIcon,
  PlusIcon,
  FlagIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import { FlagIcon as FlagIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { Dialog, DialogTitle, DialogDescription, DialogActions } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { TranslationSelectionModal } from '@/components/newsroom/TranslationSelectionModal';
import { StageTransitionModal } from '@/components/ui/stage-transition-modal';
import { ReviewStatusBanner } from '@/components/ui/review-status-banner';
import { WorkflowBar, StageProgressCard } from '@/components/newsroom/WorkflowBar';
import { CategoryModal } from '@/components/newsroom/CategoryModal';
import { TagModal } from '@/components/newsroom/TagModal';
import { ReassignButton } from '@/components/newsroom/ReassignButton';

import { useStory, useDeleteStory, useToggleStoryBulletinFlag } from '@/hooks/use-stories';
import { useCategories } from '@/hooks/use-categories';
import { useTags, useCreateTag } from '@/hooks/use-tags';
import { useClassifications } from '@/hooks/use-classifications';
import { ClassificationType } from '@prisma/client';
import {
  canEditStoryByStage,
  canDeleteStoryByStage,
  canFlagStoryForBulletin,
  canRequestRevision,
} from '@/lib/permissions';
import { StaffRole, StoryStage, AudioClip } from '@prisma/client';
import { StageBadge } from '@/components/ui/stage-badge';
import { RevisionRequestBanner } from '@/components/ui/revision-request-banner';
import { useQuery } from '@tanstack/react-query';


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

// Helper: should show delete button (stage-based)
function canShowDeleteButton(
  userRole: StaffRole | null,
  stage: StoryStage | null,
  authorId: string,
  userId: string | null
) {
  return canDeleteStoryByStage(userRole, stage, authorId, userId ?? '');
}

// Helper: should show reassign button (SUB_EDITOR+ only)
function canShowReassignButton(userRole: StaffRole | null) {
  if (!userRole) return false;
  return ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
}

// Helper: get reassignment type based on story stage
function getReassignmentType(stage: StoryStage | null): 'reviewer' | 'approver' | 'translator' | null {
  if (!stage) return null;
  if (stage === 'NEEDS_JOURNALIST_REVIEW') return 'reviewer';
  if (stage === 'NEEDS_SUB_EDITOR_APPROVAL') return 'approver';
  if (stage === 'DRAFT') return 'translator'; // For translation stories in draft
  return null;
}

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const storyId = params.id as string;
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showStageTransitionModal, setShowStageTransitionModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);

  // Metadata state for modals
  const [metadataCategoryId, setMetadataCategoryId] = useState<string | null>(null);
  const [metadataTagIds, setMetadataTagIds] = useState<string[]>([]);
  const [metadataLanguageId, setMetadataLanguageId] = useState<string | null>(null);
  const [metadataReligionId, setMetadataReligionId] = useState<string | null>(null);
  const [metadataLocalityId, setMetadataLocalityId] = useState<string | null>(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Modal visibility state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showReligionModal, setShowReligionModal] = useState(false);
  const [showLocalityModal, setShowLocalityModal] = useState(false);
  const [showOptionalTagsModal, setShowOptionalTagsModal] = useState(false);

  // Fetch single story
  const { data: story, isLoading } = useStory(storyId);

  // Fetch categories, tags, and classifications for modals
  const { data: categoriesData } = useCategories(true); // flat=true to get all categories including nested
  const { data: tagsData } = useTags();
  const createTagMutation = useCreateTag();
  const { data: languageClassificationsData } = useClassifications(ClassificationType.LANGUAGE);
  const { data: religionClassificationsData } = useClassifications(ClassificationType.RELIGION);
  const { data: localityClassificationsData } = useClassifications(ClassificationType.LOCALITY);

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
  const allTags = tagsData?.tags || []; // Tags are now just general topical tags

  // Get classifications by type
  const languageClassifications = languageClassificationsData?.classifications || [];
  const religionClassifications = religionClassificationsData?.classifications || [];
  const localityClassifications = localityClassificationsData?.classifications || [];

  // Mutations
  const deleteStoryMutation = useDeleteStory();
  const toggleBulletinFlagMutation = useToggleStoryBulletinFlag();

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

  // Determine if user can request revision (uses imported canRequestRevision from permissions.ts)
  const showRevisionButton = canRequestRevision(
    (session?.user?.staffRole as StaffRole) ?? null,
    (story?.stage as StoryStage) ?? null,
    story?.assignedReviewerId ?? null,
    story?.assignedApproverId ?? null,
    session?.user?.id ?? ''
  );

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


  const handleDelete = async () => {
    // Check permissions before attempting delete (stage-based)
    if (!story || !canDeleteStoryByStage(session?.user?.staffRole ?? null, story.stage, story.authorId, session?.user?.id ?? '')) {
      toast.error('You do not have permission to delete this story');
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

  // Toggle bulletin flag handler
  const handleToggleBulletinFlag = async () => {
    if (!story) return;
    try {
      await toggleBulletinFlagMutation.mutateAsync({
        id: storyId,
        flagged: !story.flaggedForBulletin,
      });
      toast.success(story.flaggedForBulletin ? 'Story unflagged for bulletin' : 'Story flagged for bulletin');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle bulletin flag';
      toast.error(errorMessage);
    }
  };

  // Modal handlers - each saves immediately
  const handleCategorySelected = async (categoryId: string) => {
    setIsSavingMetadata(true);
    try {
      const formData = new FormData();
      formData.append('categoryId', categoryId);

      const response = await fetch(`/api/newsroom/stories/${storyId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update category');
      }

      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      toast.success('Category updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setIsSavingMetadata(false);
      setShowCategoryModal(false);
    }
  };

  const handleLanguageSelected = async (classificationIds: string[]) => {
    const classificationId = classificationIds.length > 0 ? classificationIds[0] : null;
    if (!classificationId) {
      setShowLanguageModal(false);
      return;
    }

    setIsSavingMetadata(true);
    try {
      // Get current classifications and update language
      const currentClassifications = story?.classifications || [];
      const otherClassifications = currentClassifications
        .filter((sc: any) => sc.classification?.type !== 'LANGUAGE')
        .map((sc: any) => sc.classification.id);

      const allClassificationIds = [...otherClassifications, classificationId];

      const formData = new FormData();
      formData.append('classificationIds', JSON.stringify(allClassificationIds));

      const response = await fetch(`/api/newsroom/stories/${storyId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update language');
      }

      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      toast.success('Language updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update language');
    } finally {
      setIsSavingMetadata(false);
      setShowLanguageModal(false);
    }
  };

  const handleReligionSelected = async (classificationIds: string[]) => {
    const classificationId = classificationIds.length > 0 ? classificationIds[0] : null;
    if (!classificationId) {
      setShowReligionModal(false);
      return;
    }

    setIsSavingMetadata(true);
    try {
      // Get current classifications and update religion
      const currentClassifications = story?.classifications || [];
      const otherClassifications = currentClassifications
        .filter((sc: any) => sc.classification?.type !== 'RELIGION')
        .map((sc: any) => sc.classification.id);

      const allClassificationIds = [...otherClassifications, classificationId];

      const formData = new FormData();
      formData.append('classificationIds', JSON.stringify(allClassificationIds));

      const response = await fetch(`/api/newsroom/stories/${storyId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update religion');
      }

      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      toast.success('Religion updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update religion');
    } finally {
      setIsSavingMetadata(false);
      setShowReligionModal(false);
    }
  };

  const handleLocalitySelected = async (classificationIds: string[]) => {
    const classificationId = classificationIds.length > 0 ? classificationIds[0] : null;

    setIsSavingMetadata(true);
    try {
      // Get current classifications and update locality
      const currentClassifications = story?.classifications || [];
      const otherClassifications = currentClassifications
        .filter((sc: any) => sc.classification?.type !== 'LOCALITY')
        .map((sc: any) => sc.classification.id);

      const allClassificationIds = classificationId
        ? [...otherClassifications, classificationId]
        : otherClassifications;

      const formData = new FormData();
      formData.append('classificationIds', JSON.stringify(allClassificationIds));

      const response = await fetch(`/api/newsroom/stories/${storyId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update locality');
      }

      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      toast.success('Locality updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update locality');
    } finally {
      setIsSavingMetadata(false);
      setShowLocalityModal(false);
    }
  };

  const handleOptionalTagsSelected = async (tagIds: string[]) => {
    // Save tags immediately
    setIsSavingMetadata(true);
    try {
      const formData = new FormData();
      formData.append('tagIds', JSON.stringify(tagIds));

      const response = await fetch(`/api/newsroom/stories/${storyId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tags');
      }

      // Refresh story data immediately
      await queryClient.refetchQueries({ queryKey: ['story', storyId] });
      toast.success('Tags updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update tags');
    } finally {
      setIsSavingMetadata(false);
      setShowOptionalTagsModal(false);
    }
  };

  const handleCreateTag = async (name: string) => {
    try {
      const newTag = await createTagMutation.mutateAsync({ name });
      // Return the created tag so the modal can auto-select it
      return {
        id: newTag.id,
        name: newTag.name,
        slug: newTag.slug,
        color: newTag.color,
        _count: { stories: 0 },
      };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tag');
      return null;
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

  // Calculate word count from HTML content
  const getWordCount = (html: string | null | undefined): number => {
    if (!html) return 0;
    // Strip HTML tags and get plain text
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
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

  // Helper to get classification by type
  const getClassificationByType = (type: 'LANGUAGE' | 'RELIGION' | 'LOCALITY') => {
    return story.classifications?.find((sc: any) => sc.classification?.type === type)?.classification;
  };

  const languageClassification = getClassificationByType('LANGUAGE');
  const religionClassification = getClassificationByType('RELIGION');
  const localityClassification = getClassificationByType('LOCALITY');

  // Workflow bar action handlers
  const handleMarkReadyToPublish = async () => {
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

      const result = await response.json();
      const newStage = result.story?.stage || result.stage;
      if (newStage === 'PUBLISHED') {
        toast.success('Story published successfully');
      } else {
        toast.success('Story marked as ready to publish');
      }
      await queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as ready to publish';
      toast.error(errorMessage);
    }
  };

  // Determine workflow bar visibility flags
  const showMarkReadyToPublish = story.stage === 'APPROVED' &&
    story.translations &&
    story.translations.length > 0 &&
    story.translations.every((t: any) => t.stage === 'APPROVED' || t.stage === 'TRANSLATED' || t.stage === 'PUBLISHED') &&
    session?.user?.staffRole &&
    ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole);

  const showCreateTranslation = !story.isTranslation &&
    story.stage === 'APPROVED' &&
    (!story.translations || story.translations.length === 0) &&
    (!translationsData?.stories || translationsData.stories.length === 0) &&
    session?.user?.staffRole &&
    ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole);

  const showSkipTranslation = !story.isTranslation &&
    story.stage === 'APPROVED' &&
    (!story.translations || story.translations.length === 0) &&
    (!translationsData?.stories || translationsData.stories.length === 0) &&
    session?.user?.staffRole &&
    ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole);

  const showReviewForPublishing = story.status === 'READY_TO_PUBLISH' &&
    session?.user?.staffRole &&
    ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole);

  // Only render the main page content if story is defined
  return (
    <Container>
      {/* Workflow Bar - Sticky navigation and actions */}
      <WorkflowBar
        storyId={storyId}
        stage={story.stage}
        authorRole={story.author.staffRole}
        assignedReviewer={story.assignedReviewer}
        assignedApprover={story.assignedApprover}
        nextAction={nextAction}
        showRevisionButton={showRevisionButton}
        showMarkReadyToPublish={showMarkReadyToPublish}
        showCreateTranslation={showCreateTranslation}
        showSkipTranslation={showSkipTranslation}
        showReviewForPublishing={showReviewForPublishing}
        isTranslating={isTranslating}
        onStageTransition={() => setShowStageTransitionModal(true)}
        onRevisionRequest={() => setShowRevisionModal(true)}
        onMarkReadyToPublish={handleMarkReadyToPublish}
        onCreateTranslation={handleSendForTranslation}
        onSkipTranslation={handleMarkReadyToPublish}
        onReviewForPublishing={() => router.push(`/newsroom/stories/${storyId}/publish`)}
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Zone 2: Story Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Story Preview Card - Mimics frontend display */}
          <Card className="overflow-hidden">
            {/* Story Header with Inline Metadata */}
            <div className="bg-gradient-to-r from-kelly-green/10 to-kelly-green/5 p-6 border-b border-zinc-200">
              {/* Top Row: Badges + Action Buttons */}
              <div className="flex items-start justify-between gap-4 mb-4">
                {/* Inline Metadata Badges */}
                <div className="flex flex-wrap gap-2">
                  {story.category && (
                    <Badge color="blue">{story.category.name}</Badge>
                  )}
                  {languageClassification && (
                    <Badge color="purple">{languageClassification.name}</Badge>
                  )}
                  {religionClassification && (
                    <Badge color="orange">{religionClassification.name}</Badge>
                  )}
                  {localityClassification && (
                    <Badge color="zinc">{localityClassification.name}</Badge>
                  )}
                  {story.isTranslation && (
                    <Badge color="purple">
                      <GlobeAltIcon className="h-3 w-3 mr-1" />
                      {story.language} Translation
                    </Badge>
                  )}
                  {/* Used in Bulletin Badge */}
                  {story._count?.bulletinStories && story._count.bulletinStories > 0 && (
                    <Badge color="indigo">
                      <NewspaperIcon className="h-3 w-3 mr-1" />
                      In {story._count.bulletinStories} Bulletin{story._count.bulletinStories > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {/* Flagged for Bulletin Badge */}
                  {story.flaggedForBulletin && (
                    <Badge color="amber">
                      <FlagIconSolid className="h-3 w-3 mr-1" />
                      Flagged for Bulletin
                    </Badge>
                  )}
                </div>

                {/* Action Buttons - Top Right */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Reassign Button - For SUB_EDITOR+ on stories in review/approval stages */}
                  {canShowReassignButton(session?.user?.staffRole ?? null) &&
                   getReassignmentType(story.stage) &&
                   // Only show for review/approval stages, or translation stories in draft
                   (story.stage === 'NEEDS_JOURNALIST_REVIEW' ||
                    story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' ||
                    (story.isTranslation && story.stage === 'DRAFT')) && (
                    <ReassignButton
                      storyId={story.id}
                      storyTitle={story.title}
                      currentAssignee={
                        story.stage === 'NEEDS_JOURNALIST_REVIEW' && story.assignedReviewer
                          ? `${story.assignedReviewer.firstName} ${story.assignedReviewer.lastName}`
                          : story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' && story.assignedApprover
                          ? `${story.assignedApprover.firstName} ${story.assignedApprover.lastName}`
                          : story.isTranslation && story.author
                          ? `${story.author.firstName} ${story.author.lastName}`
                          : null
                      }
                      type={getReassignmentType(story.stage)!}
                      targetLanguage={story.isTranslation ? story.language : undefined}
                      compact={false}
                    />
                  )}

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

                  {/* Flag for Bulletin Button */}
                  {canFlagStoryForBulletin(session?.user?.staffRole ?? null) && (
                    <Button
                      color="white"
                      className={story.flaggedForBulletin ? "!bg-amber-100 !border-amber-300 !text-amber-800" : ""}
                      onClick={handleToggleBulletinFlag}
                      disabled={toggleBulletinFlagMutation.isPending}
                    >
                      {story.flaggedForBulletin ? (
                        <FlagIconSolid className="h-4 w-4 mr-2" />
                      ) : (
                        <FlagIcon className="h-4 w-4 mr-2" />
                      )}
                      {story.flaggedForBulletin ? 'Unflag' : 'Flag'}
                    </Button>
                  )}

                  {/* Edit Button */}
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
                      color="white"
                      onClick={() => router.push(`/newsroom/stories/${story.id}/edit`)}
                    >
                      <PencilSquareIcon className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}

                  {/* Delete Button */}
                  {canShowDeleteButton(session?.user?.staffRole ?? null, story.stage, story.authorId, session?.user?.id || null) && (
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
              </div>

              {/* Title */}
              <Heading level={1} className="text-2xl font-bold text-zinc-900 mb-4">
                {story.isTranslation && (!story.content || story.content.trim() === '')
                  ? `${story.title} (Translation Pending)`
                  : story.title
                }
              </Heading>

              {/* Author Byline */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    className="h-10 w-10"
                    name={`${story.author.firstName} ${story.author.lastName}`}
                  />
                  <div>
                    <Text className="font-medium text-zinc-900">
                      {story.author.firstName} {story.author.lastName}
                    </Text>
                    <Text className="text-sm text-zinc-500">
                      {formatDate(story.publishedAt || story.createdAt)}
                    </Text>
                  </div>
                </div>
                {/* Word Count */}
                {story.content && story.content.trim() !== '' && (
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-zinc-500">Words</Text>
                    <Badge color="zinc" className="text-xs">{getWordCount(story.content).toLocaleString()}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Story Content */}
            <div className="p-6">
              {story.isTranslation && (!story.content || story.content.trim() === '') ? (
                <div className="text-center py-12">
                  <GlobeAltIcon className="h-16 w-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Translation Not Yet Started
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                    {story.authorId === session?.user?.id
                      ? 'This translation is waiting for you to add content. Click "Translate" to begin.'
                      : ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session?.user?.staffRole || '')
                        ? `Assigned to ${story.author.firstName} ${story.author.lastName}. You can click "Translate" to start or edit the translation.`
                        : `This translation is assigned to ${story.author.firstName} ${story.author.lastName} and has not yet been started.`
                    }
                  </p>
                </div>
              ) : (
                <div
                  className="prose prose-zinc max-w-none text-zinc-900 leading-relaxed"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                  dangerouslySetInnerHTML={{ __html: story.content }}
                />
              )}

              {/* Audio Clips - Integrated into content card */}
              {story.audioClips && story.audioClips.length > 0 && (
                <div className="mt-8 pt-6 border-t border-zinc-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MusicalNoteIcon className="h-4 w-4 text-kelly-green" />
                      <Text className="font-medium text-zinc-700">Audio</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Text className="text-sm text-zinc-500">Clips</Text>
                      <Badge color="zinc" className="text-xs">{story.audioClips.length}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {story.audioClips.map((sac: { id: string; audioClip: AudioClip }) => {
                      const clip = sac.audioClip;
                      return (
                        <CustomAudioPlayer
                          key={clip.id}
                          clip={clip}
                          onError={() => toast.error('Failed to play audio file')}
                          compact
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No audio clips message - only show if story has content */}
              {(!story.audioClips || story.audioClips.length === 0) &&
               story.content && story.content.trim() !== '' && (
                <div className="mt-8 pt-6 border-t border-zinc-200">
                  <div className="flex items-center justify-between text-zinc-400">
                    <div className="flex items-center gap-2">
                      <MusicalNoteIcon className="h-4 w-4" />
                      <Text className="text-sm">No audio</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Text className="text-sm text-zinc-400">Clips</Text>
                      <Badge color="zinc" className="text-xs">0</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags - Display at bottom of content with inline edit */}
              <div className="mt-6 pt-6 border-t border-zinc-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    {story.tags && story.tags.length > 0 ? (
                      story.tags.map((storyTag: { tag: { id: string; name: string } }) => (
                        <Badge key={storyTag.tag.id} color="green">{storyTag.tag.name}</Badge>
                      ))
                    ) : (
                      <Text className="text-sm text-zinc-400 italic">No tags</Text>
                    )}
                  </div>
                  {/* Add/Edit button - for sub-editors and above */}
                  {session?.user?.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
                    <button
                      onClick={() => {
                        setMetadataTagIds(story.tags?.map((st: any) => st.tag.id) || []);
                        setShowOptionalTagsModal(true);
                      }}
                      className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors border border-emerald-200 hover:border-emerald-300"
                      title={story.tags?.length > 0 ? "Edit tags" : "Add tags"}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Contextual Banners - Moved below story preview */}
          {/* Review Status Banner - Show when story is under review (visible to all staff) */}
          {story.stage === 'NEEDS_JOURNALIST_REVIEW' &&
           story.assignedReviewer && (
            <ReviewStatusBanner
              stage={story.stage}
              reviewer={story.assignedReviewer}
              updatedAt={story.updatedAt}
            />
          )}

          {/* Review Status Banner - Show when story is awaiting approval (visible to all staff) */}
          {story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' &&
           story.assignedApprover && (
            <ReviewStatusBanner
              stage={story.stage}
              reviewer={story.assignedApprover}
              updatedAt={story.updatedAt}
            />
          )}

          {/* Revision Request Banner - For Author */}
          {unresolvedRevisions.length > 0 && story.authorId === session?.user?.id && (
            <RevisionRequestBanner
              revisionRequests={unresolvedRevisions}
            />
          )}

          {/* Approval Sent Banner - For Reviewer who sent for approval */}
          {story.authorId !== session?.user?.id &&
           story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' &&
           story.assignedReviewerId === session?.user?.id &&
           story.assignedApprover && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <Text className="font-semibold text-blue-900">Sent for Approval</Text>
                  <Text className="text-sm text-blue-700 mt-1">
                    You sent this story to {story.assignedApprover.firstName} {story.assignedApprover.lastName} for approval.
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {/* Revision Requested Banner - For Reviewer/Journalist */}
          {userRequestedRevision && story.stage === 'DRAFT' && story.authorId !== session?.user?.id && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <Text className="font-semibold text-blue-900">Revision Requested</Text>
                  <Text className="text-sm text-blue-700 mt-1">
                    You requested revision from {story.author.firstName} {story.author.lastName}.
                  </Text>
                  {unresolvedRevisions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {unresolvedRevisions
                        .filter((r: any) => r.requestedById === session?.user?.id)
                        .map((revision: any) => (
                          <div key={revision.id} className="rounded bg-blue-100 p-3">
                            <Text className="text-xs text-blue-600">
                              Requested on {new Date(revision.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                            <Text className="text-sm text-blue-900 mt-1">{revision.reason}</Text>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Translation Assignment Banner */}
          {story.isTranslation && story.stage === 'DRAFT' && (!story.content || story.content.trim() === '') && (
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-start gap-3">
                <GlobeAltIcon className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <Text className="font-semibold text-purple-900">
                    {story.authorId === session?.user?.id ? 'Translation Assignment' : 'Translation In Progress'}
                  </Text>
                  <Text className="text-sm text-purple-700 mt-1">
                    {story.authorId === session?.user?.id ? (
                      <>You have been assigned to translate this story to <strong>{story.language}</strong>.</>
                    ) : ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session?.user?.staffRole || '') ? (
                      <>Assigned to <strong>{story.author.firstName} {story.author.lastName}</strong> for translation to <strong>{story.language}</strong>. You can edit this translation.</>
                    ) : (
                      <>This story is assigned to <strong>{story.author.firstName} {story.author.lastName}</strong> for translation.</>
                    )}
                  </Text>
                </div>
              </div>
            </Card>
          )}
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

          {/* Stage Progress Card */}
          <Card className="p-6">
            <Heading level={3} className="mb-4">Workflow</Heading>
            <StageProgressCard currentStage={story.stage} authorRole={story.author?.role} />
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <Text className="text-sm text-zinc-500">Last modified</Text>
                <Text className="text-sm text-zinc-700">
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

          {/* Category Card - Show for sub-editors and above (editable independently) */}
          {session?.user?.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Heading level={3}>Category</Heading>
                <Button
                  color="white"
                  onClick={() => {
                    setMetadataCategoryId(story.categoryId);
                    setShowCategoryModal(true);
                  }}
                  className="text-sm"
                >
                  Edit
                </Button>
              </div>

              {story.category ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {story.category.parent && (
                    <>
                      <Badge color="blue">{story.category.parent.name}</Badge>
                      <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
                    </>
                  )}
                  <Badge color={story.category.parent ? "purple" : "blue"}>{story.category.name}</Badge>
                </div>
              ) : (
                <span className="italic text-zinc-400">No category assigned</span>
              )}
              {!story.categoryId && story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' && (
                <div className="flex items-center gap-2 text-sm text-amber-600 mt-3">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span>Required for approval</span>
                </div>
              )}
            </Card>
          )}

          {/* Classifications Card - Show for sub-editors and above (editable independently) */}
          {session?.user?.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
            <Card className="p-6">
              <Heading level={3} className="mb-2">Classifications</Heading>
              <Text className="text-sm text-zinc-500 mb-4">Required for content distribution</Text>

              <div className="space-y-3">
                {/* Language */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-zinc-600 w-20">Language <span className="text-red-500">*</span></Text>
                    {story.classifications?.some((sc: any) => sc.classification?.type === 'LANGUAGE') ? (
                      story.classifications
                        .filter((sc: any) => sc.classification?.type === 'LANGUAGE')
                        .map((sc: any) => (
                          <Badge key={sc.classification.id} color="blue">{sc.classification.name}</Badge>
                        ))
                    ) : (
                      <span className="italic text-zinc-400">Not assigned</span>
                    )}
                  </div>
                  <Button
                    color="white"
                    onClick={() => {
                      const langClass = story.classifications?.find((sc: any) => sc.classification?.type === 'LANGUAGE');
                      setMetadataLanguageId(langClass?.classification?.id || null);
                      setShowLanguageModal(true);
                    }}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>

                {/* Religion */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-zinc-600 w-20">Religion <span className="text-red-500">*</span></Text>
                    {story.classifications?.some((sc: any) => sc.classification?.type === 'RELIGION') ? (
                      story.classifications
                        .filter((sc: any) => sc.classification?.type === 'RELIGION')
                        .map((sc: any) => (
                          <Badge key={sc.classification.id} color="purple">{sc.classification.name}</Badge>
                        ))
                    ) : (
                      <span className="italic text-zinc-400">Not assigned</span>
                    )}
                  </div>
                  <Button
                    color="white"
                    onClick={() => {
                      const relClass = story.classifications?.find((sc: any) => sc.classification?.type === 'RELIGION');
                      setMetadataReligionId(relClass?.classification?.id || null);
                      setShowReligionModal(true);
                    }}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>

                {/* Locality */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-zinc-600 w-20">Locality</Text>
                    {story.classifications?.some((sc: any) => sc.classification?.type === 'LOCALITY') ? (
                      story.classifications
                        .filter((sc: any) => sc.classification?.type === 'LOCALITY')
                        .map((sc: any) => (
                          <Badge key={sc.classification.id} color="orange">{sc.classification.name}</Badge>
                        ))
                    ) : (
                      <span className="italic text-zinc-400">Optional</span>
                    )}
                  </div>
                  <Button
                    color="white"
                    onClick={() => {
                      const locClass = story.classifications?.find((sc: any) => sc.classification?.type === 'LOCALITY');
                      setMetadataLocalityId(locClass?.classification?.id || null);
                      setShowLocalityModal(true);
                    }}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                </div>

                {/* Validation warnings */}
                {story.stage === 'NEEDS_SUB_EDITOR_APPROVAL' && (
                  <div className="mt-3 space-y-1">
                    {!story.classifications?.some((sc: any) => sc.classification?.type === 'LANGUAGE') && (
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>Language required for approval</span>
                      </div>
                    )}
                    {!story.classifications?.some((sc: any) => sc.classification?.type === 'RELIGION') && (
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>Religion required for approval</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Read-only Category card for journalists */}
          {session?.user?.staffRole === 'JOURNALIST' && (
            <Card className="p-6">
              <Heading level={3} className="mb-4">Category</Heading>
              {story.category ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {story.category.parent && (
                    <>
                      <Badge color="blue">{story.category.parent.name}</Badge>
                      <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
                    </>
                  )}
                  <Badge color={story.category.parent ? "purple" : "blue"}>{story.category.name}</Badge>
                </div>
              ) : (
                <span className="italic text-zinc-400">No category assigned</span>
              )}
            </Card>
          )}

          {/* Read-only Classifications card for journalists */}
          {session?.user?.staffRole === 'JOURNALIST' && (
            <Card className="p-6">
              <Heading level={3} className="mb-2">Classifications</Heading>
              <Text className="text-sm text-zinc-500 mb-4">Content distribution settings</Text>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Text className="text-sm text-zinc-600 w-20">Language:</Text>
                  {story.classifications?.some((sc: any) => sc.classification?.type === 'LANGUAGE') ? (
                    story.classifications
                      .filter((sc: any) => sc.classification?.type === 'LANGUAGE')
                      .map((sc: any) => (
                        <Badge key={sc.classification.id} color="blue">{sc.classification.name}</Badge>
                      ))
                  ) : (
                    <span className="italic text-zinc-400">Not assigned</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Text className="text-sm text-zinc-600 w-20">Religion:</Text>
                  {story.classifications?.some((sc: any) => sc.classification?.type === 'RELIGION') ? (
                    story.classifications
                      .filter((sc: any) => sc.classification?.type === 'RELIGION')
                      .map((sc: any) => (
                        <Badge key={sc.classification.id} color="purple">{sc.classification.name}</Badge>
                      ))
                  ) : (
                    <span className="italic text-zinc-400">Not assigned</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Text className="text-sm text-zinc-600 w-20">Locality:</Text>
                  {story.classifications?.some((sc: any) => sc.classification?.type === 'LOCALITY') ? (
                    story.classifications
                      .filter((sc: any) => sc.classification?.type === 'LOCALITY')
                      .map((sc: any) => (
                        <Badge key={sc.classification.id} color="orange">{sc.classification.name}</Badge>
                      ))
                  ) : (
                    <span className="italic text-zinc-400">Optional</span>
                  )}
                </div>
              </div>
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
      <ConfirmDialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Story"
        description="Are you sure you want to delete this story? This action cannot be undone."
        isPending={isDeleting}
      />

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

      {/* Language Classification Selection Modal */}
      <TagModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onConfirm={handleLanguageSelected}
        tags={languageClassifications.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, _count: { stories: c._count?.stories || 0 } }))}
        selectedTagIds={metadataLanguageId ? [metadataLanguageId] : []}
        title="Select Language"
        description="Choose the language for this story. This is required before the story can be approved."
        required
        singleSelect
        showSearch={false}
        isLoading={isSavingMetadata}
        confirmButtonText="Select Language"
      />

      {/* Religion Classification Selection Modal */}
      <TagModal
        isOpen={showReligionModal}
        onClose={() => setShowReligionModal(false)}
        onConfirm={handleReligionSelected}
        tags={religionClassifications.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, _count: { stories: c._count?.stories || 0 } }))}
        selectedTagIds={metadataReligionId ? [metadataReligionId] : []}
        title="Select Religion"
        description="Choose the religious perspective for this story. This is required before the story can be approved."
        required
        singleSelect
        showSearch={false}
        isLoading={isSavingMetadata}
        confirmButtonText="Select Religion"
      />

      {/* Locality Classification Selection Modal */}
      <TagModal
        isOpen={showLocalityModal}
        onClose={() => setShowLocalityModal(false)}
        onConfirm={handleLocalitySelected}
        tags={localityClassifications.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, _count: { stories: c._count?.stories || 0 } }))}
        selectedTagIds={metadataLocalityId ? [metadataLocalityId] : []}
        title="Select Locality"
        description="Choose the locality for this story (optional)."
        singleSelect
        showSearch={false}
        isLoading={isSavingMetadata}
        confirmButtonText="Select Locality"
      />

      {/* Tags Selection Modal */}
      <TagModal
        isOpen={showOptionalTagsModal}
        onClose={() => setShowOptionalTagsModal(false)}
        onConfirm={handleOptionalTagsSelected}
        tags={allTags}
        selectedTagIds={metadataTagIds}
        title="Select Tags"
        description="Choose topical tags for this story. You can also create new tags."
        showSearch
        isLoading={isSavingMetadata}
        confirmButtonText="Save Tags"
        allowCreate
        onTagCreate={handleCreateTag}
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