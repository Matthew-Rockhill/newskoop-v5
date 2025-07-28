import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Divider } from '@/components/ui/divider';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileUpload } from '@/components/ui/file-upload';

// Simplified schema for interns - only title, content, and audio
const internStorySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
});

type InternStoryFormData = z.infer<typeof internStorySchema>;

export function InternStoryForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [audioFiles, setAudioFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<InternStoryFormData>({
    resolver: zodResolver(internStorySchema),
  });

  const onSubmit: SubmitHandler<InternStoryFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add story data - interns create stories with DRAFT status and MEDIUM priority by default
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('priority', 'MEDIUM'); // Default priority for interns
      formData.append('status', 'DRAFT'); // Interns always start with draft
      
      // Add audio files
      audioFiles.forEach((audioFile, index) => {
        formData.append(`audioFile_${index}`, audioFile);
        if (audioFiles[index].description) {
          formData.append(`audioDescription_${index}`, audioFiles[index].description);
        }
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
      toast.success('Story created successfully!');
      router.push(`/admin/newsroom/stories/${story.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create story');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Write New Story"
          action={{
            label: "Back to Dashboard",
            onClick: () => router.push('/admin')
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
              maxFileSize={50}
            />
          </Card>

          <Divider />

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              color="white"
              onClick={() => router.push('/admin')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Story'}
            </Button>
          </div>
        </form>
      </div>

    </Container>
  );
} 