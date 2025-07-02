'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
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

import { useCategories } from '@/hooks/use-categories';
import { useTags } from '@/hooks/use-tags';
import { storyUpdateSchema } from '@/lib/validations';
import { StoryPriority, ContentLanguage, ReligiousFilter } from '@prisma/client';

type StoryFormData = z.infer<typeof storyUpdateSchema>;

export default function EditStoryPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [story, setStory] = useState<any>(null);
  const [content, setContent] = useState('');

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
    reset,
  } = useForm<StoryFormData>({
    resolver: zodResolver(storyUpdateSchema),
  });

  const selectedTagIds = watch('tagIds') || [];

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
          categoryId: storyData.categoryId,
          language: storyData.language,
          religiousFilter: storyData.religiousFilter || '',
          tagIds: storyData.tags?.map((st: any) => st.tag.id) || [],
        });
      } catch (error) {
        toast.error('Failed to load story');
        router.push('/admin/newsroom/stories');
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [storyId, reset, router]);

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
      router.push(`/admin/newsroom/stories/${storyId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update story');
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
          <Button href="/admin/newsroom/stories" className="mt-4">
            Back to Stories
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title="Edit Story"
        description={`Editing: ${story.title}`}
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
            <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              <Field>
                <Label htmlFor="language">Language</Label>
                <Select
                  id="language"
                  {...register('language')}
                >
                  <option value="ENGLISH">English</option>
                  <option value="AFRIKAANS">Afrikaans</option>
                  <option value="XHOSA">Xhosa</option>
                </Select>
                {errors.language && (
                  <ErrorMessage>{errors.language.message}</ErrorMessage>
                )}
              </Field>

              <Field>
                <Label htmlFor="religiousFilter">Religious Filter</Label>
                <Description>
                  Optional religious content classification
                </Description>
                <Select
                  id="religiousFilter"
                  {...register('religiousFilter')}
                >
                  <option value="">No religious filter</option>
                  <option value="CHRISTIAN">Christian</option>
                  <option value="MUSLIM">Muslim</option>
                </Select>
                {errors.religiousFilter && (
                  <ErrorMessage>{errors.religiousFilter.message}</ErrorMessage>
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Container>
  );
} 