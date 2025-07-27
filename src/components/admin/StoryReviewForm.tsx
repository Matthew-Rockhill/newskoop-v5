'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  DocumentTextIcon,
  TagIcon,
  PlusIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label, Description } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Checkbox, CheckboxGroup, CheckboxField } from '@/components/ui/checkbox';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { RevisionRequestModal } from './RevisionRequestModal';
import { CategoryModal } from './CategoryModal';
import { TagModal } from './TagModal';

import { useStory, useUpdateStoryStatus } from '@/hooks/use-stories';
import { useCategories } from '@/hooks/use-categories';
import { useTags } from '@/hooks/use-tags';
import type { Category } from '@/hooks/use-categories';
import type { Tag } from '@/hooks/use-tags';
import type { StaffRole } from '@prisma/client';
import { canUpdateStoryStatus } from '@/lib/permissions';

// Priority badge colors
const priorityColors = {
  LOW: 'zinc',
  MEDIUM: 'blue',
  HIGH: 'amber',
  URGENT: 'red',
  BREAKING: 'red',
} as const;

// Review checklist schema - removed the auto-checked fields from validation
const reviewChecklistSchema = z.object({
  // Content Review Checklist - only the manually checked items
  languageGrammar: z.boolean().refine(val => val, 'Language & Grammar must be checked'),
  toneStyle: z.boolean().refine(val => val, 'Tone & Style must be checked'),
  factChecking: z.boolean().refine(val => val, 'Fact Checking must be checked'),
  audioQuality: z.boolean().refine(val => val, 'Audio Quality must be checked'),
  
  // Classification - these are validated separately
  categoryId: z.string().min(1, 'Category is required'),
  languageTagIds: z.array(z.string()).min(1, 'At least one language tag is required'),
  religionTagIds: z.array(z.string()).min(1, 'At least one religion tag is required'),
  localityTagIds: z.array(z.string()).optional(),
  generalTagIds: z.array(z.string()).optional(),
});

type ReviewChecklistData = z.infer<typeof reviewChecklistSchema>;

interface StoryReviewFormProps {
  storyId: string;
}

// Helper to build breadcrumb path for a category
function getCategoryBreadcrumb(category: Category | undefined): string {
  if (!category) return '';
  const path = [category.name];
  let current = category.parent;
  while (current) {
    path.unshift(current.name);
    current = (current as any).parent;
  }
  return path.join(' > ');
}

// Helper to map language tag names to StoryLanguage enum values
function mapLanguageTagToStoryLanguage(languageTagName: string): 'ENGLISH' | 'AFRIKAANS' | 'XHOSA' | null {
  const languageMap: Record<string, 'ENGLISH' | 'AFRIKAANS' | 'XHOSA'> = {
    'English': 'ENGLISH',
    'Afrikaans': 'AFRIKAANS',
    'Xhosa': 'XHOSA',
  };
  return languageMap[languageTagName] || null;
}

// Helper: should show approve button
function canShowApproveButton(status: string) {
  return status === 'PENDING_APPROVAL';
}
// Helper: should show request revision button
function canShowRequestRevisionButton(userRole: string | null, status: string) {
  if (!userRole) return false;
  if (userRole === 'JOURNALIST' && status === 'IN_REVIEW') return true;
  if (
    ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole) &&
    status === 'PENDING_APPROVAL'
  ) return true;
  return false;
}
// Helper: should show edit button
function canShowEditButton(status: string) {
  // Only allow edit for DRAFT, IN_REVIEW, NEEDS_REVISION
  return ['DRAFT', 'IN_REVIEW', 'NEEDS_REVISION'].includes(status);
}

export function StoryReviewForm({ storyId }: StoryReviewFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [fieldInteractions, setFieldInteractions] = useState<Record<string, boolean>>({});
  
  // Audio state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLanguageTagsModal, setShowLanguageTagsModal] = useState(false);
  const [showReligionTagsModal, setShowReligionTagsModal] = useState(false);
  const [showLocalityTagsModal, setShowLocalityTagsModal] = useState(false);
  const [showGeneralTagsModal, setShowGeneralTagsModal] = useState(false);

  // Fetch story data
  const { data: story, isLoading: storyLoading, error: storyError } = useStory(storyId);
  
  // Fetch categories and tags
  const { data: categoriesData } = useCategories(true); // Get flat structure for modal
  const { data: languageTags } = useTags('', 'LANGUAGE');
  const { data: religionTags } = useTags('', 'RELIGION');
  const { data: localityTags } = useTags('', 'LOCALITY');
  const { data: generalTags } = useTags('', 'GENERAL');

  const updateStoryStatusMutation = useUpdateStoryStatus();

  const {
    watch,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<ReviewChecklistData>({
    resolver: zodResolver(reviewChecklistSchema),
    mode: 'onChange',
    defaultValues: {
      languageGrammar: false,
      toneStyle: false,
      factChecking: false,
      audioQuality: false,
      languageTagIds: [],
      religionTagIds: [],
      localityTagIds: [],
      generalTagIds: [],
    },
  });

  // Watch form values for real-time validation
  const watchedValues = watch();

  // Helper function to handle checkbox changes
  const handleCheckboxChange = (field: keyof ReviewChecklistData, checked: boolean) => {
    setValue(field, checked);
    setFieldInteractions(prev => ({ ...prev, [field]: true }));
    // Only trigger validation for the specific field that was changed
    setTimeout(() => trigger(field), 0);
  };

  // Set initial values when story loads
  useEffect(() => {
    if (story) {
      setValue('categoryId', story.categoryId);
      
      // Set existing tags
      const existingTags: Tag[] = story.tags.map((t: { tag: Tag }) => t.tag);
      setValue('languageTagIds', existingTags.filter((t: Tag) => t.category === 'LANGUAGE').map((t: Tag) => t.id));
      setValue('religionTagIds', existingTags.filter((t: Tag) => t.category === 'RELIGION').map((t: Tag) => t.id));
      setValue('localityTagIds', existingTags.filter((t: Tag) => t.category === 'LOCALITY').map((t: Tag) => t.id));
      setValue('generalTagIds', existingTags.filter((t: Tag) => t.category === 'GENERAL').map((t: Tag) => t.id));
      
      // Trigger validation after a short delay to ensure form has updated
      setTimeout(() => {
        trigger();
      }, 100);
    }
  }, [story, setValue, trigger]);

  // Update validation when category or tags change
  useEffect(() => {
    trigger();
  }, [watchedValues.categoryId, watchedValues.languageTagIds, watchedValues.religionTagIds, trigger]);

  const handleApprove = async (data: ReviewChecklistData) => {
    if (!canUpdateStoryStatus(session?.user?.staffRole as StaffRole | null, story?.status || 'DRAFT', 'APPROVED', story?.authorId, session?.user?.id)) {
      toast.error('You do not have permission to approve this story');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the selected language tag to determine story language
      const selectedLanguageTag = languageTagOptions.find((tag: Tag) => data.languageTagIds.includes(tag.id));
      const storyLanguage = selectedLanguageTag ? mapLanguageTagToStoryLanguage(selectedLanguageTag.name) : null;

      // Always include all current tags in the tagIds array
      const allTagIds = [
        ...data.languageTagIds,
        ...data.religionTagIds,
        ...(data.localityTagIds || []),
        ...(data.generalTagIds || []),
      ];

      // Update story with new category, tags, and language
      await updateStoryStatusMutation.mutateAsync({
        id: storyId,
        data: { 
          status: 'APPROVED',
          categoryId: data.categoryId,
          language: storyLanguage || 'ENGLISH', // Default to English if no language tag selected
          tagIds: allTagIds,
        },
      });
      
      toast.success('Story approved successfully');
      router.push(`/admin/newsroom/stories/${storyId}`);
    } catch {
      toast.error('Failed to approve story');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = () => {
    setShowRevisionModal(true);
  };

  const handleEdit = () => {
    router.push(`/admin/newsroom/stories/${storyId}/edit`);
  };

  const handleRevisionRequested = async (revisionNotes: string[]) => {
    if (!canUpdateStoryStatus(session?.user?.staffRole as StaffRole | null, story?.status || 'DRAFT', 'NEEDS_REVISION', story?.authorId, session?.user?.id)) {
      toast.error('You do not have permission to request revision');
      return;
    }

    setIsSubmitting(true);
    try {
      // Persist each revision note as a comment
      for (const note of revisionNotes) {
        await fetch(`/api/newsroom/stories/${storyId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: note,
            type: 'REVISION_REQUEST',
            category: 'REVISION_REQUEST',
          }),
        });
      }
      // Then update the story status
      await updateStoryStatusMutation.mutateAsync({
        id: storyId,
        data: { status: 'NEEDS_REVISION' },
      });
      
      toast.success('Revision requested successfully');
      router.push(`/admin/newsroom/stories/${storyId}/edit`);
    } catch {
      toast.error('Failed to request revision');
    } finally {
      setIsSubmitting(false);
      setShowRevisionModal(false);
    }
  };

  // Audio handlers
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

  // Classification handlers
  const handleCategoryConfirm = (categoryId: string) => {
    setValue('categoryId', categoryId);
    // Trigger validation after category is set
    setTimeout(() => trigger(), 0);
  };

  const handleLanguageTagsConfirm = (tagIds: string[]) => {
    setValue('languageTagIds', tagIds);
    setTimeout(() => trigger(), 0);
  };

  const handleReligionTagsConfirm = (tagIds: string[]) => {
    setValue('religionTagIds', tagIds);
    setTimeout(() => trigger(), 0);
  };

  const handleLocalityTagsConfirm = (tagIds: string[]) => {
    setValue('localityTagIds', tagIds);
    setTimeout(() => trigger(), 0);
  };

  const handleGeneralTagsConfirm = (tagIds: string[]) => {
    setValue('generalTagIds', tagIds);
    setTimeout(() => trigger(), 0);
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

  if (storyLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading story for review...</p>
        </div>
      </Container>
    );
  }

  if (storyError || !story) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading story: {storyError?.message || 'Story not found'}</p>
          <Button onClick={() => router.push('/admin/newsroom/stories')} className="mt-4">
            Back to Stories
          </Button>
        </div>
      </Container>
    );
  }

  const categories = categoriesData?.categories || [];
  const languageTagOptions = languageTags?.tags || [];
  const religionTagOptions = religionTags?.tags || [];
  const localityTagOptions = localityTags?.tags || [];
  const generalTagOptions = generalTags?.tags || [];

  // Get selected category and tag names for display
  const selectedCategory = categories.find((c: Category) => c.id === watchedValues.categoryId);
  const selectedLanguageTags = languageTagOptions.filter((t: Tag) => watchedValues.languageTagIds?.includes(t.id));
  const selectedReligionTags = religionTagOptions.filter((t: Tag) => watchedValues.religionTagIds?.includes(t.id));
  const selectedLocalityTags = localityTagOptions.filter((t: Tag) => watchedValues.localityTagIds?.includes(t.id));
  const selectedGeneralTags = generalTagOptions.filter((t: Tag) => watchedValues.generalTagIds?.includes(t.id));

  // Check if category and tags are properly assigned for auto-checked items
  const isCategoryAssigned = !!selectedCategory;
  const areRequiredTagsAssigned = selectedLanguageTags.length > 0 && selectedReligionTags.length > 0;

  return (
    <>
      <Container>
        <PageHeader
          title={story.title}
          description={
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
                <Badge color="blue">{story.status.replace('_', ' ')}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Priority:</span>
                <Badge color={priorityColors[story.priority as keyof typeof priorityColors]}>{story.priority}</Badge>
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
              },

            ]
          }}
          actions={
            <div className="flex items-center space-x-3">
              {canShowEditButton(story.status) && (
                <Button
                  color="secondary"
                  onClick={handleEdit}
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </Button>
              )}
              {canShowRequestRevisionButton(session?.user?.staffRole as string | null, story.status) && (
                <Button
                  color="secondary"
                  onClick={handleRequestRevision}
                  disabled={isSubmitting}
                >
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  Request Revision
                </Button>
              )}
              {canShowApproveButton(story.status) && (
                <Button
                  color="primary"
                  onClick={handleApprove}
                  disabled={!isValid || isSubmitting}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Approve
                </Button>
              )}
            </div>
          }
        />

        {/* Warning Callout for Incomplete Checklist */}
        {!isValid && (
          <Card className="p-4 mt-6 border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <Heading level={5} className="text-yellow-800 mb-1">
                  Review Checklist Incomplete
                </Heading>
                <Text className="text-sm text-yellow-700">
                  This story cannot be approved until all required review checklist items are completed. 
                  Please review the content, audio quality, and ensure proper classification before proceeding.
                </Text>
              </div>
            </div>
          </Card>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Story Content */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Heading level={3}>Story Content</Heading>
                <Badge color="zinc">
                  {story.content.replace(/<[^>]*>/g, '').split(/\s+/).filter((word: string) => word.length > 0).length} words
                </Badge>
              </div>
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
                <Badge color="zinc">
                  {story.audioClips?.length || 0} clips
                </Badge>
              </div>
              
              {!story.audioClips || story.audioClips.length === 0 ? (
                <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MusicalNoteIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <Text className="text-sm font-medium text-gray-700">No Audio Clips Added</Text>
                      <Text className="text-xs text-gray-500">This story has no audio content attached</Text>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {story.audioClips.map((clip: any) => (
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

            {/* Content Review Checklist */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <DocumentTextIcon className="h-6 w-6 text-kelly-green" />
                <Heading level={4}>Content Review Checklist</Heading>
              </div>
              
              <form onSubmit={handleApprove}>
                <CheckboxGroup>
                  <CheckboxField>
                    <Checkbox
                      id="languageGrammar"
                      checked={watchedValues.languageGrammar}
                      onChange={(checked) => handleCheckboxChange('languageGrammar', checked)}
                    />
                    <Label htmlFor="languageGrammar">
                      Language & Grammar
                    </Label>
                    <Description>
                      Check for spelling, grammar, punctuation, and language clarity
                    </Description>
                    {fieldInteractions.languageGrammar && errors.languageGrammar && (
                      <Text className="text-sm text-red-600 mt-1">{errors.languageGrammar?.message}</Text>
                    )}
                  </CheckboxField>

                  <CheckboxField>
                    <Checkbox
                      id="toneStyle"
                      checked={watchedValues.toneStyle}
                      onChange={(checked) => handleCheckboxChange('toneStyle', checked)}
                    />
                    <Label htmlFor="toneStyle">
                      Tone & Style
                    </Label>
                    <Description>
                      Verify appropriate tone, style consistency, and audience appropriateness
                    </Description>
                    {fieldInteractions.toneStyle && errors.toneStyle && (
                      <Text className="text-sm text-red-600 mt-1">{errors.toneStyle?.message}</Text>
                    )}
                  </CheckboxField>

                  <CheckboxField>
                    <Checkbox
                      id="factChecking"
                      checked={watchedValues.factChecking}
                      onChange={(checked) => handleCheckboxChange('factChecking', checked)}
                    />
                    <Label htmlFor="factChecking">
                      Fact Checking
                    </Label>
                    <Description>
                      Verify accuracy of facts, dates, names, and statistics
                    </Description>
                    {fieldInteractions.factChecking && errors.factChecking && (
                      <Text className="text-sm text-red-600 mt-1">{errors.factChecking?.message}</Text>
                    )}
                  </CheckboxField>

                  <CheckboxField>
                    <Checkbox
                      id="audioQuality"
                      checked={watchedValues.audioQuality}
                      onChange={(checked) => handleCheckboxChange('audioQuality', checked)}
                    />
                    <Label htmlFor="audioQuality">
                      Audio Quality
                    </Label>
                    <Description>
                      Review audio clarity, volume, and technical quality
                    </Description>
                    {fieldInteractions.audioQuality && errors.audioQuality && (
                      <Text className="text-sm text-red-600 mt-1">{errors.audioQuality?.message}</Text>
                    )}
                  </CheckboxField>

                  <CheckboxField>
                    <Checkbox
                      id="categoryAssigned"
                      checked={isCategoryAssigned}
                      disabled
                    />
                    <Label htmlFor="categoryAssigned">
                      Category Assigned
                    </Label>
                    <Description>
                      {selectedCategory ? `Assigned: ${getCategoryBreadcrumb(selectedCategory)}` : 'No category assigned'}
                    </Description>
                  </CheckboxField>

                  <CheckboxField>
                    <Checkbox
                      id="tagsAssigned"
                      checked={areRequiredTagsAssigned}
                      disabled
                    />
                    <Label htmlFor="tagsAssigned">
                      Required Tags Assigned
                    </Label>
                    <Description>
                      {areRequiredTagsAssigned 
                        ? `Language and Religion tags assigned`
                        : 'Language and Religion tags required'}
                    </Description>
                  </CheckboxField>
                </CheckboxGroup>
              </form>
            </Card>
          </div>
        </div>

        {/* Category Section - Full Width */}
        <Card className="p-6 mt-8">
          <div className="flex items-center gap-2 mb-6">
            <TagIcon className="h-6 w-6 text-kelly-green" />
            <Heading level={4}>Category</Heading>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <Text className="text-sm font-medium">Story Category</Text>
            <Button
              color="secondary"
              onClick={() => setShowCategoryModal(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {selectedCategory ? 'Change' : 'Add'}
            </Button>
          </div>
          {selectedCategory ? (
            <div className="p-3 bg-green-50 rounded-lg">
              <Text className="font-medium text-green-800">{getCategoryBreadcrumb(selectedCategory)}</Text>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg">
              <Text className="text-gray-500">No category selected</Text>
            </div>
          )}
          {errors.categoryId && (
            <Text className="text-sm text-red-600 mt-2">{errors.categoryId.message}</Text>
          )}
        </Card>

        {/* Tags Section - Full Width */}
        <Card className="p-6 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <TagIcon className="h-6 w-6 text-kelly-green" />
            <Heading level={4}>Tags</Heading>
          </div>

          {/* Warning Callout for Required Tags - only show if tags are missing */}
          {(!areRequiredTagsAssigned) && (
            <div className="mb-6 p-3 border-yellow-200 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <Text className="text-sm text-yellow-700">
                    <strong>Required Tags:</strong> Language and Religion tags are required for all stories.
                  </Text>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <Text className="text-sm font-medium">Story Tags</Text>
            <div className="flex gap-2">
              <Button
              color="secondary"
              onClick={() => setShowLanguageTagsModal(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Language
            </Button>
            <Button
              color="secondary"
              onClick={() => setShowReligionTagsModal(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Religion
            </Button>
            <Button
              color="secondary"
              onClick={() => setShowLocalityTagsModal(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Locality
            </Button>
            <Button
              color="secondary"
              onClick={() => setShowGeneralTagsModal(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              General
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          {/* Language Tags - Badge display for single-select */}
          {selectedLanguageTags.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Text className="text-sm font-medium text-blue-700">Language:</Text>
                <Badge color="blue">{selectedLanguageTags[0].name}</Badge>
              </div>
            </div>
          )}
          
          {/* Religion Tags - Badge display for single-select */}
          {selectedReligionTags.length > 0 && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <Text className="text-sm font-medium text-purple-700">Religion:</Text>
                <Badge color="purple">{selectedReligionTags[0].name}</Badge>
              </div>
            </div>
          )}
          
          {/* Locality Tags - Badge display for single-select */}
          {selectedLocalityTags.length > 0 && (
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Text className="text-sm font-medium text-orange-700">Locality:</Text>
                <Badge color="orange">{selectedLocalityTags[0].name}</Badge>
              </div>
            </div>
          )}
          
          {/* General Tags - Badge display for multi-select */}
          {selectedGeneralTags.length > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Text className="text-sm font-medium text-green-700">General:</Text>
                <div className="flex flex-wrap gap-1">
                  {selectedGeneralTags.map((tag: Tag) => (
                    <Badge key={tag.id} color="green">{tag.name}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Show message if no tags selected */}
          {selectedLanguageTags.length === 0 && selectedReligionTags.length === 0 && 
           selectedLocalityTags.length === 0 && selectedGeneralTags.length === 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <Text className="text-gray-500">No tags selected</Text>
            </div>
          )}
        </div>
        
        {/* Error messages */}
        {errors.languageTagIds && (
          <div className="mt-2">
            <Text className="text-sm text-red-600">{errors.languageTagIds.message}</Text>
          </div>
        )}
        {errors.religionTagIds && (
          <div className="mt-2">
            <Text className="text-sm text-red-600">{errors.religionTagIds.message}</Text>
          </div>
        )}
      </Card>
    </Container>

    {/* Modals */}
    <CategoryModal
      isOpen={showCategoryModal}
      onClose={() => setShowCategoryModal(false)}
      onConfirm={handleCategoryConfirm}
      categories={categories}
      selectedCategoryId={watchedValues.categoryId}
      isLoading={isSubmitting}
    />

    <TagModal
      isOpen={showLanguageTagsModal}
      onClose={() => setShowLanguageTagsModal(false)}
      onConfirm={handleLanguageTagsConfirm}
      tags={languageTagOptions}
      selectedTagIds={watchedValues.languageTagIds || []}
      title="Select Language Tags"
      description="Choose the language tags that apply to this story"
      required={true}
      isLoading={isSubmitting}
      showSearch={false}
      singleSelect={true}
    />

    <TagModal
      isOpen={showReligionTagsModal}
      onClose={() => setShowReligionTagsModal(false)}
      onConfirm={handleReligionTagsConfirm}
      tags={religionTagOptions}
      selectedTagIds={watchedValues.religionTagIds || []}
      title="Select Religion Tags"
      description="Choose the religion tags that apply to this story"
      required={true}
      isLoading={isSubmitting}
      showSearch={false}
      singleSelect={true}
    />

    <TagModal
      isOpen={showLocalityTagsModal}
      onClose={() => setShowLocalityTagsModal(false)}
      onConfirm={handleLocalityTagsConfirm}
      tags={localityTagOptions}
      selectedTagIds={watchedValues.localityTagIds || []}
      title="Select Locality Tags"
      description="Choose the locality tags that apply to this story (optional)"
      required={false}
      isLoading={isSubmitting}
      showSearch={false}
      singleSelect={true}
    />

    <TagModal
      isOpen={showGeneralTagsModal}
      onClose={() => setShowGeneralTagsModal(false)}
      onConfirm={handleGeneralTagsConfirm}
      tags={generalTagOptions}
      selectedTagIds={watchedValues.generalTagIds || []}
      title="Select General Tags"
      description="Choose the general tags that apply to this story (optional)"
      required={false}
      isLoading={isSubmitting}
      showSearch={true}
      singleSelect={false}
    />

    {/* Revision Request Modal */}
    <RevisionRequestModal
      isOpen={showRevisionModal}
      onClose={() => {
        setShowRevisionModal(false);
      }}
      onConfirm={handleRevisionRequested}
      storyTitle={story?.title || ''}
      isLoading={isSubmitting}
    />
  </>
);
}