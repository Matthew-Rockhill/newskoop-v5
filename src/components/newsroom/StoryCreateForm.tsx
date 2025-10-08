import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Divider } from '@/components/ui/divider';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileUpload } from '@/components/ui/file-upload';
import { StageTransitionModal } from '@/components/ui/stage-transition-modal';
import { StaffRole } from '@prisma/client';

interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
}

// Story creation schema - works for all roles
const storyCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
});

type StoryCreateFormData = z.infer<typeof storyCreateSchema>;

export function StoryCreateForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [submitAction, setSubmitAction] = useState<'draft' | 'review'>('draft');
  const [pendingFormData, setPendingFormData] = useState<StoryCreateFormData | null>(null);

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  const users = usersData?.users || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<StoryCreateFormData>({
    resolver: zodResolver(storyCreateSchema),
  });

  const onSubmit: SubmitHandler<StoryCreateFormData> = async (data) => {
    if (submitAction === 'review') {
      // For journalists and editors+: save story as draft and redirect to detail page
      // where they can use "Send for Approval" button
      if (session?.user?.staffRole && ['JOURNALIST', 'EDITOR', 'SUB_EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole)) {
        const story = await createStory(data, 'DRAFT');
        if (story) {
          router.push(`/newsroom/stories/${story.id}`);
        }
        return;
      }

      // For interns: show reviewer selection modal
      setPendingFormData(data);
      setShowReviewerModal(true);
      return;
    }

    // Handle draft creation
    await createStory(data, 'DRAFT');
  };

  const createStory = async (data: StoryCreateFormData, status: 'DRAFT' | 'IN_REVIEW', reviewerId?: string) => {
    setIsSubmitting(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add story data
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('status', status);
      
      // Add reviewer if submitting for review
      if (reviewerId) {
        formData.append('reviewerId', reviewerId);
      }
      
      // Add audio files
      audioFiles.forEach((audioFile, index) => {
        formData.append(`audioFile_${index}`, audioFile.file);
      });
      formData.append('audioFilesCount', String(audioFiles.length));

      const response = await fetch('/api/newsroom/stories', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create story');
      }

      const story = await response.json();
      
      if (status === 'DRAFT') {
        toast.success('Story saved as draft!');
        // Don't redirect here for editors/journalists using "Review Story" - let caller handle it
        const rolesWithReviewAccess = ['JOURNALIST', 'EDITOR', 'SUB_EDITOR', 'ADMIN', 'SUPERADMIN'];
        if (!session?.user?.staffRole || !rolesWithReviewAccess.includes(session.user.staffRole) || submitAction !== 'review') {
          router.push(`/newsroom/stories/${story.id}/edit`);
        }
      } else {
        toast.success('Story submitted for review!');
        router.push(`/newsroom/stories/${story.id}`);
      }
      
      return story;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create story');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewerSelected = async (data: { assignedUserId?: string; checklistData?: Record<string, boolean> }) => {
    if (!data.assignedUserId) {
      toast.error('Please select a reviewer');
      return;
    }

    if (!pendingFormData) {
      toast.error('Form data not available');
      return;
    }

    await createStory(pendingFormData, 'IN_REVIEW', data.assignedUserId);
    setPendingFormData(null);
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Write New Story"
          action={{
            label: "Back to Dashboard",
            onClick: () => router.push('/newsroom')
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
                  <Description>
                    Write a clear, compelling headline for your story
                  </Description>
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
                  <Description>
                    Write your story here. Include all the important details and make it engaging for readers.
                  </Description>
                  <RichTextEditor
                    content={content}
                    onChange={(newContent) => {
                      setContent(newContent);
                      setValue('content', newContent);
                    }}
                    placeholder="Start writing your story here..."
                    className="min-h-[400px]"
                  />
                  {errors.content && (
                    <ErrorMessage>{errors.content.message}</ErrorMessage>
                  )}
                </Field>
              </FieldGroup>
            </Fieldset>
          </Card>

          {/* Audio Files */}
          <Card className="p-6">
            <Heading level={2} className="mb-6">Audio Files</Heading>
            <p className="text-sm text-gray-600 mb-4">
              Upload any audio clips that go with your story (interviews, sound bites, etc.)
            </p>
            
            <FileUpload
              onFilesChange={setAudioFiles}
              maxFiles={5}
              maxFileSize={100}
            />
          </Card>

          <Divider />

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              type="button"
              color="white"
              onClick={() => router.push('/newsroom')}
            >
              Cancel
            </Button>
            
            <div className="flex space-x-4">
              <Button
                type="submit"
                color="white"
                disabled={isSubmitting}
                onClick={() => setSubmitAction('draft')}
              >
                {isSubmitting && submitAction === 'draft' ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={() => setSubmitAction('review')}
              >
                {isSubmitting && submitAction === 'review'
                  ? 'Creating...'
                  : (session?.user?.staffRole === 'JOURNALIST' || ['EDITOR', 'SUB_EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session?.user?.staffRole || ''))
                    ? 'Create Story'
                    : 'Submit for Review'
                }
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Reviewer Selection Modal with Checklist */}
      <StageTransitionModal
        isOpen={showReviewerModal}
        onClose={() => {
          setShowReviewerModal(false);
          setPendingFormData(null);
        }}
        onSubmit={handleReviewerSelected}
        title="Submit for Review"
        description="Complete the checklist below and assign a journalist to review your story."
        actionLabel="Submit for Review"
        actionColor="primary"
        requiresAssignment={true}
        assignmentLabel="Assign Journalist Reviewer"
        assignmentRoles={['JOURNALIST' as StaffRole]}
        users={users}
        checklistItems={[
          { id: 'content', label: 'Content is complete and accurate', checked: false, required: true },
          { id: 'grammar', label: 'Grammar and spelling checked', checked: false, required: true },
          { id: 'sources', label: 'Sources verified', checked: false, required: true },
        ]}
        isSubmitting={isSubmitting}
      />
    </Container>
  );
} 