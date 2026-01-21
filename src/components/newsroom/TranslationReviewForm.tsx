'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateTranslationQueries, invalidateCommentQueries } from '@/lib/query-invalidation';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  DocumentTextIcon,
  EyeIcon,
  UserGroupIcon,
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
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { RevisionRequestModal } from './RevisionRequestModal';

interface RevisionNote {
  id: string;
  content: string;
  category?: string;
}

// Translation Review Schema - Single schema with conditional validation
const translationReviewSchema = z.object({
  languageAccuracy: z.boolean(),
  culturalAdaptation: z.boolean(),
  completeness: z.boolean(),
  consistency: z.boolean(),
  qualityControl: z.boolean().optional(),
  finalApproval: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // For translators, all content items must be checked
  const requiredFields = ['languageAccuracy', 'culturalAdaptation', 'completeness', 'consistency'];
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

type ReviewChecklistData = z.infer<typeof translationReviewSchema>;

interface TranslationReviewFormProps {
  translationId: string;
}

// Helper functions
function canShowApproveButton(status: string) {
  return status === 'NEEDS_REVIEW';
}

function canShowRequestRevisionButton(userRole: string | null, status: string, isOwnTranslation: boolean = false) {
  if (!userRole) return false;
  // Sub-editors and above can request revision on NEEDS_REVIEW translations
  return ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole) && status === 'NEEDS_REVIEW';
}

function canShowEditButton(status: string) {
  return ['IN_PROGRESS', 'REJECTED'].includes(status);
}

function canShowSubmitForReviewButton(userRole: string | null, status: string, isOwnTranslation: boolean) {
  if (!userRole) return false;
  // Translators can submit their own translations for review
  return status === 'IN_PROGRESS' && isOwnTranslation;
}

export function TranslationReviewForm({ translationId }: TranslationReviewFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [fieldInteractions, setFieldInteractions] = useState<Record<string, boolean>>({});

  // Fetch translation data
  const { data: translationData, isLoading: translationLoading, error: translationError } = useQuery({
    queryKey: ['translation', translationId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/translations/${translationId}`);
      if (!response.ok) throw new Error('Failed to fetch translation');
      return response.json();
    },
    enabled: !!translationId,
  });

  const translation = translationData?.translation;
  const translatedStory = translation?.translatedStory;
  const originalStory = translation?.originalStory;

  // Determine user role and appropriate schema
  const userRole = session?.user?.staffRole;
  const isOwnTranslation = translation?.assignedToId === session?.user?.id;
  const isSubEditorRole = ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole || '');
  
  // Determine which UI/schema to use based on role AND translation status
  const isTranslator = isOwnTranslation && translation?.status === 'IN_PROGRESS';
  const isSubEditor = isSubEditorRole && translation?.status === 'NEEDS_REVIEW';

  // Simple default values
  const defaultValues = {
    languageAccuracy: false,
    culturalAdaptation: false,
    completeness: false,
    consistency: false,
    qualityControl: false,
    finalApproval: false,
  };

  const {
    watch,
    setValue,
    trigger,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ReviewChecklistData>({
    resolver: zodResolver(translationReviewSchema),
    mode: 'onChange',
    defaultValues,
  });

  // Watch form values for real-time validation
  const watchedValues = watch();

  // Load any existing review data when translation loads
  useEffect(() => {
    if (translation && translatedStory) {
      // If sub-editor is viewing and translator has already reviewed, pre-check those items
      if (isSubEditor && translation.status === 'NEEDS_REVIEW') {
        reset({
          languageAccuracy: true,
          culturalAdaptation: true,
          completeness: true,
          consistency: true,
          qualityControl: false,
          finalApproval: false,
        });
      }
    }
  }, [translation, translatedStory, isSubEditor, reset]);

  // Helper function to handle checkbox changes
  const handleCheckboxChange = (field: string, checked: boolean) => {
    setValue(field as any, checked);
    setFieldInteractions(prev => ({ ...prev, [field]: true }));
    setTimeout(() => trigger(field as any), 0);
  };

  const handleApprove = async (data: ReviewChecklistData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/newsroom/translations/${translationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          reviewerId: session?.user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve translation');
      }

      // Invalidate translation queries so changes reflect immediately
      invalidateTranslationQueries(queryClient, translationId);

      toast.success('Translation approved successfully');
      router.push(`/newsroom/translations/${translationId}`);
    } catch (error) {
      toast.error('Failed to approve translation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = () => {
    setShowRevisionModal(true);
  };

  const handleEdit = () => {
    router.push(`/newsroom/translations/${translationId}/work`);
  };

  const handleSubmitForReview = async () => {
    // For translators, validate the checklist is complete
    if (isTranslator && !isValid) {
      toast.error('Please complete the translation review checklist before submitting for review');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/newsroom/translations/${translationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'NEEDS_REVIEW',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit translation for review');
      }

      // Invalidate translation queries so changes reflect immediately
      invalidateTranslationQueries(queryClient, translationId);

      toast.success('Translation submitted for review successfully');
      router.push(`/newsroom/translations/${translationId}`);
    } catch (error) {
      toast.error('Failed to submit translation for review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevisionRequested = async (revisionNotes: RevisionNote[]) => {
    setIsSubmitting(true);
    try {
      // Create comments for revision notes
      for (const note of revisionNotes) {
        if (translatedStory?.id) {
          const commentResponse = await fetch(`/api/newsroom/stories/${translatedStory.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: note.content,
              type: 'REVISION_REQUEST',
              category: note.category || 'TRANSLATION_REVISION',
            }),
          });

          if (commentResponse.ok) {
            // Invalidate comment queries so revision notes appear immediately
            invalidateCommentQueries(queryClient, translatedStory.id);
          }
        }
      }

      // Update translation status
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

      // Invalidate translation queries so changes reflect immediately
      invalidateTranslationQueries(queryClient, translationId);

      toast.success('Revision requested successfully');
      router.push(`/newsroom/translations/${translationId}/work`);
    } catch (error) {
      toast.error('Failed to request revision');
    } finally {
      setIsSubmitting(false);
      setShowRevisionModal(false);
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

  if (translationLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading translation for review...</p>
        </div>
      </Container>
    );
  }

  if (translationError || !translation) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading translation: {translationError?.message || 'Translation not found'}</p>
          <Button onClick={() => router.push('/newsroom')} className="mt-4">
            Back to Dashboard
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
          title={`Translation Review: ${translatedStory?.title || originalStory?.title || 'Untitled'}`}
          description={
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
                <Badge color={statusColors[translation.status as keyof typeof statusColors]}>
                  {translation.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Target Language:</span>
                <Badge color="blue">{translation.targetLanguage}</Badge>
              </div>
            </div>
          }
          metadata={{
            sections: [
              {
                title: "Translation Details",
                items: [
                  {
                    label: "Translator",
                    value: translation.assignedTo ? (
                      <>
                        <Avatar
                          className="h-6 w-6"
                          name={`${translation.assignedTo.firstName} ${translation.assignedTo.lastName}`}
                        />
                        <span>{translation.assignedTo.firstName} {translation.assignedTo.lastName}</span>
                      </>
                    ) : (
                      <span>Unassigned</span>
                    ),
                    type: 'avatar'
                  },
                  {
                    label: "Created",
                    value: formatDate(translation.createdAt),
                    type: 'date'
                  },
                  {
                    label: "Last Updated",
                    value: formatDate(translation.updatedAt),
                    type: 'date'
                  }
                ]
              },
            ]
          }}
          actions={
            <div className="flex items-center space-x-3">
              {canShowEditButton(translation.status) && isOwnTranslation && (
                <Button
                  color="secondary"
                  onClick={handleEdit}
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Translation
                </Button>
              )}
              {canShowRequestRevisionButton(session?.user?.staffRole as string | null, translation.status, isOwnTranslation) && (
                <Button
                  color="secondary"
                  onClick={handleRequestRevision}
                  disabled={isSubmitting}
                >
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  Request Revision
                </Button>
              )}
              {canShowSubmitForReviewButton(session?.user?.staffRole as string | null, translation.status, isOwnTranslation) && (
                <Button
                  color="primary"
                  onClick={handleSubmitForReview}
                  disabled={isSubmitting || (isTranslator && !isValid)}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Submit for Review
                </Button>
              )}
              {canShowApproveButton(translation.status) && isSubEditor && (
                <Button
                  color="primary"
                  onClick={() => handleApprove(watch())}
                  disabled={!isValid || isSubmitting}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Approve Translation
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
                  {isTranslator 
                    ? 'Please complete all translation review items before submitting for review.'
                    : 'Please complete the quality control review before approving.'}
                </Text>
              </div>
            </div>
          </Card>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Story Content */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Heading level={3}>Original Story</Heading>
                <div className="flex items-center gap-2">
                  <Badge color="zinc">{originalStory?.language || 'ENGLISH'}</Badge>
                  <Badge color="zinc">
                    {originalStory?.content?.replace(/<[^>]*>/g, '').split(/\s+/).filter((word: string) => word.length > 0).length || 0} words
                  </Badge>
                </div>
              </div>
              <div className="mb-4">
                <Heading level={4} className="text-lg font-semibold">{originalStory?.title}</Heading>
                <Text className="text-sm text-zinc-600">
                  By {originalStory?.author?.firstName} {originalStory?.author?.lastName}
                </Text>
              </div>
              <div className="prose max-w-none">
                <div 
                  className="text-zinc-900 leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: originalStory?.content || '' }}
                />
              </div>
            </Card>
          </div>

          {/* Translated Story Content */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Heading level={3}>Translation</Heading>
                <div className="flex items-center gap-2">
                  <Badge color="blue">{translation.targetLanguage}</Badge>
                  {translatedStory && (
                    <Badge color="zinc">
                      {translatedStory.content.replace(/<[^>]*>/g, '').split(/\s+/).filter((word: string) => word.length > 0).length} words
                    </Badge>
                  )}
                </div>
              </div>
              {translatedStory ? (
                <>
                  <div className="mb-4">
                    <Heading level={4} className="text-lg font-semibold">{translatedStory.title}</Heading>
                    <Text className="text-sm text-zinc-600">
                      Translated by {translation.assignedTo?.firstName} {translation.assignedTo?.lastName}
                    </Text>
                  </div>
                  <div className="prose max-w-none">
                    <div 
                      className="text-zinc-900 leading-relaxed space-y-4"
                      dangerouslySetInnerHTML={{ __html: translatedStory.content }}
                    />
                  </div>
                </>
              ) : (
                <div className="p-4 border border-zinc-200 bg-zinc-50 rounded-lg">
                  <Text className="text-zinc-500">Translation not yet completed</Text>
                </div>
              )}
            </Card>

            {/* Role-Based Review Checklist */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <DocumentTextIcon className="h-6 w-6 text-kelly-green" />
                <Heading level={4}>
                  {isTranslator ? 'Translation Review Checklist' : 'QA Review Checklist'}
                </Heading>
              </div>
              
              {isTranslator && !isValid && (
                <div className="mb-4 p-3 border-amber-200 bg-amber-50 rounded-lg">
                  <Text className="text-sm text-amber-700">
                    <strong>Required:</strong> Complete all translation review items before submitting for review.
                  </Text>
                </div>
              )}
              
              <form onSubmit={handleSubmit(isTranslator ? handleSubmitForReview : handleApprove)}>
                <CheckboxGroup>
                  {/* Language Accuracy */}
                  <CheckboxField>
                    <Checkbox
                      id="languageAccuracy"
                      checked={watchedValues.languageAccuracy || false}
                      onChange={(checked) => handleCheckboxChange('languageAccuracy', checked)}
                      disabled={isSubEditor} // Auto-checked for sub-editors
                    />
                    <Label>
                      Language Accuracy
                      {isSubEditor && <span className="text-green-600 ml-2">✓ Verified by Translator</span>}
                    </Label>
                    <Description>
                      Verify accurate translation of meaning, context, and tone
                    </Description>
                    {fieldInteractions.languageAccuracy && errors.languageAccuracy && (
                      <Text className="text-sm text-red-600 mt-1">{(errors.languageAccuracy as any)?.message}</Text>
                    )}
                  </CheckboxField>

                  {/* Cultural Adaptation */}
                  <CheckboxField>
                    <Checkbox
                      id="culturalAdaptation"
                      checked={watchedValues.culturalAdaptation || false}
                      onChange={(checked) => handleCheckboxChange('culturalAdaptation', checked)}
                      disabled={isSubEditor} // Auto-checked for sub-editors
                    />
                    <Label>
                      Cultural Adaptation
                      {isSubEditor && <span className="text-green-600 ml-2">✓ Verified by Translator</span>}
                    </Label>
                    <Description>
                      Check cultural appropriateness and local context adaptation
                    </Description>
                    {fieldInteractions.culturalAdaptation && errors.culturalAdaptation && (
                      <Text className="text-sm text-red-600 mt-1">{(errors.culturalAdaptation as any)?.message}</Text>
                    )}
                  </CheckboxField>

                  {/* Completeness */}
                  <CheckboxField>
                    <Checkbox
                      id="completeness"
                      checked={watchedValues.completeness || false}
                      onChange={(checked) => handleCheckboxChange('completeness', checked)}
                      disabled={isSubEditor} // Auto-checked for sub-editors
                    />
                    <Label>
                      Completeness
                      {isSubEditor && <span className="text-green-600 ml-2">✓ Verified by Translator</span>}
                    </Label>
                    <Description>
                      Ensure all content has been translated without omissions
                    </Description>
                    {fieldInteractions.completeness && errors.completeness && (
                      <Text className="text-sm text-red-600 mt-1">{(errors.completeness as any)?.message}</Text>
                    )}
                  </CheckboxField>

                  {/* Consistency */}
                  <CheckboxField>
                    <Checkbox
                      id="consistency"
                      checked={watchedValues.consistency || false}
                      onChange={(checked) => handleCheckboxChange('consistency', checked)}
                      disabled={isSubEditor} // Auto-checked for sub-editors
                    />
                    <Label>
                      Consistency with Original
                      {isSubEditor && <span className="text-green-600 ml-2">✓ Verified by Translator</span>}
                    </Label>
                    <Description>
                      Verify consistency in style, terminology, and format
                    </Description>
                    {fieldInteractions.consistency && errors.consistency && (
                      <Text className="text-sm text-red-600 mt-1">{(errors.consistency as any)?.message}</Text>
                    )}
                  </CheckboxField>

                  {/* Sub-Editor Only Items */}
                  {isSubEditor && (
                    <>
                      <CheckboxField>
                        <Checkbox
                          id="qualityControl"
                          checked={watchedValues.qualityControl || false}
                          onChange={(checked) => handleCheckboxChange('qualityControl', checked)}
                        />
                        <Label>
                          Quality Control Review
                        </Label>
                        <Description>
                          Final quality assessment and editorial review completed
                        </Description>
                        {fieldInteractions.qualityControl && errors.qualityControl && (
                          <Text className="text-sm text-red-600 mt-1">{(errors.qualityControl as any)?.message}</Text>
                        )}
                      </CheckboxField>

                      <CheckboxField>
                        <Checkbox
                          id="finalApproval"
                          checked={watchedValues.finalApproval || false}
                          onChange={(checked) => handleCheckboxChange('finalApproval', checked)}
                        />
                        <Label>
                          Final Approval Confirmation
                        </Label>
                        <Description>
                          Translation meets all standards and is ready for publication
                        </Description>
                        {fieldInteractions.finalApproval && errors.finalApproval && (
                          <Text className="text-sm text-red-600 mt-1">{(errors.finalApproval as any)?.message}</Text>
                        )}
                      </CheckboxField>
                    </>
                  )}
                </CheckboxGroup>
              </form>
            </Card>
          </div>
        </div>
      </Container>

      {/* Revision Request Modal */}
      <RevisionRequestModal
        isOpen={showRevisionModal}
        onClose={() => {
          setShowRevisionModal(false);
        }}
        onConfirm={handleRevisionRequested}
        storyTitle={translatedStory?.title || originalStory?.title || 'Translation'}
        isLoading={isSubmitting}
      />
    </>
  );
}