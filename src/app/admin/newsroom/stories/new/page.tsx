'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Divider } from '@/components/ui/divider';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileUpload } from '@/components/ui/file-upload';

import { useCategories } from '@/hooks/use-categories';
import { useTags } from '@/hooks/use-tags';
import { storyCreateSchema } from '@/lib/validations';


type StoryFormData = z.infer<typeof storyCreateSchema>;

export default function NewStoryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [audioFiles, setAudioFiles] = useState<any[]>([]);

  const { data: categoriesData } = useCategories(true); // Flat list
  const { data: tagsData } = useTags();

  const categories = categoriesData?.categories || [];
  const tags = tagsData?.tags || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<StoryFormData>({
    resolver: zodResolver(storyCreateSchema),
    defaultValues: {
      tagIds: [],
    },
  });

  const selectedTagIds = watch('tagIds') || [];

  const handleTagToggle = (tagId: string) => {
    const currentTags = selectedTagIds;
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    setValue('tagIds', newTags);
  };

  const onSubmit: SubmitHandler<StoryFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add story data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      // Add audio files
      audioFiles.forEach((audioFile, index) => {
        formData.append(`audioFile_${index}`, audioFile.file);
        if (audioFile.description) {
          formData.append(`audioDescription_${index}`, audioFile.description);
        }
      });
      formData.append('audioFilesCount', String(audioFiles.length));

      const response = await fetch('/api/newsroom/stories', {
        method: 'POST',
        body: formData, // Remove JSON headers for FormData
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
      <PageHeader
        title="Create New Story"
        description="Write and publish news articles and editorial content"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <Card className="p-6">
          <Heading level={2} className="mb-6">Basic Information</Heading>
          
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter story title..."
                />
                {errors.title && (
                  <ErrorMessage>{errors.title.message}</ErrorMessage>
                )}
              </Field>

              <Field>
                <Label htmlFor="content">Content *</Label>
                <Description>
                  The main content of your story
                </Description>
                <RichTextEditor
                  content={content}
                  onChange={(newContent) => {
                    setContent(newContent);
                    setValue('content', newContent);
                  }}
                  placeholder="Write your story content here..."
                />
                {errors.content && (
                  <ErrorMessage>{errors.content.message}</ErrorMessage>
                )}
              </Field>
            </FieldGroup>
          </Fieldset>
        </Card>

        {/* Categorization & Settings */}
        <Card className="p-6">
          <Heading level={2} className="mb-6">Categorization & Settings</Heading>
          
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="categoryId">Category *</Label>
                <Select
                  id="categoryId"
                  {...register('categoryId')}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {'  '.repeat(category.level - 1)}{category.name}
                    </option>
                  ))}
                </Select>
                {errors.categoryId && (
                  <ErrorMessage>{errors.categoryId.message}</ErrorMessage>
                )}
              </Field>
            </FieldGroup>
          </Fieldset>
        </Card>

        {/* Tags */}
        <Card className="p-6">
          <Heading level={2} className="mb-6">Tags</Heading>
          <p className="text-base/6 text-zinc-500 mb-4 sm:text-sm/6 dark:text-zinc-400">
            Select relevant tags to help categorize and organize your story
          </p>
          
          {tags.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => handleTagToggle(tag.id)}
                  />
                  <label 
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    {tag.name}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No tags available. Create some tags first to organize your stories.</p>
          )}
        </Card>

        {/* Audio Files */}
        <Card className="p-6">
          <Heading level={2} className="mb-6">Audio Files</Heading>
          <p className="text-base/6 text-zinc-500 mb-4 sm:text-sm/6 dark:text-zinc-400">
            Upload audio clips to accompany your story
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
            onClick={() => router.back()}
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
    </Container>
  );
}