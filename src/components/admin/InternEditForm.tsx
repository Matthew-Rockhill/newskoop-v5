import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Field, FieldGroup, Fieldset, Label, ErrorMessage } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Divider } from '@/components/ui/divider';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ReviewerSelectionModal } from './ReviewerSelectionModal';
import { SubEditorSelectionModal } from './SubEditorSelectionModal';

// Simplified schema for interns - only title and content
const internStoryEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
});

type InternStoryEditFormData = z.infer<typeof internStoryEditSchema>;

interface InternEditFormProps {
  storyId: string;
}

export function InternEditForm({ storyId }: InternEditFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [story, setStory] = useState<any>(null);
  const [content, setContent] = useState('');
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [showSubEditorModal, setShowSubEditorModal] = useState(false);

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
      } catch (error) {
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
        const error = await response.json();
        throw new Error(error.error || 'Failed to update story');
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

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Edit Story"
          action={{
            label: "Back to Story",
            onClick: () => router.push(`/admin/newsroom/stories/${storyId}`)
          }}
        />

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
            
            <div className="flex space-x-4">
              <Button
                type="submit"
                color="white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </Button>
              
              {story.status === 'DRAFT' || story.status === 'NEEDS_REVISION' ? (
                <Button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : session?.user?.staffRole === 'JOURNALIST' ? 'Submit for Approval' : 'Submit for Review'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </div>
        </form>
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