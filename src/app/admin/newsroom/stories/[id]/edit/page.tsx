'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
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
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { FileUpload } from '@/components/ui/file-upload';
import { Badge } from '@/components/ui/badge';
import { MusicalNoteIcon } from '@heroicons/react/24/outline';

import { useCategories } from '@/hooks/use-categories';
import { useTags } from '@/hooks/use-tags';
import { storyUpdateSchema } from '@/lib/validations';
import { StoryPriority } from '@prisma/client';
import { InternEditForm } from '@/components/admin/InternEditForm';

type StoryFormData = z.infer<typeof storyUpdateSchema>;

export default function EditStoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;

  // All hooks must be called unconditionally
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [story, setStory] = useState<any>(null);
  const [content, setContent] = useState('');
  const [audioFiles, setAudioFiles] = useState<any[]>([]); // For new uploads
  const [removedAudioIds, setRemovedAudioIds] = useState<string[]>([]); // For removals
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<StoryFormData>({
    resolver: zodResolver(storyUpdateSchema),
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
        reset({
          title: storyData.title,
          content: storyData.content,
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

  // Show loading while session is loading
  if (status === 'loading') {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading...</p>
        </div>
      </Container>
    );
  }

  // Show Intern/Journo edit form for those roles
  if (session?.user?.staffRole === 'INTERN' || session?.user?.staffRole === 'JOURNALIST') {
    return <InternEditForm storyId={storyId} />;
  }

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
          <Button asChild className="mt-4">
            <Link href="/admin/newsroom/stories">Back to Stories</Link>
          </Button>
        </div>
      </Container>
    );
  }

  // For all other roles, show only title/content/actions, styled like create page
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
          <Card className="p-6">
            <Heading level={2} className="mb-6">Story Content</Heading>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    {...register('title')}
                    placeholder="Enter story title..."
                    className="text-lg"
                  />
                  {errors.title && (
                    <ErrorMessage>{errors.title.message}</ErrorMessage>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="content">Content *</Label>
                  <Description>The main content of your story</Description>
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

          {/* Audio Files Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level={2}>Audio Files</Heading>
              <Badge color="gray" size="sm">
                {story.audioClips?.length || 0} clips
              </Badge>
            </div>
            {/* Existing audio clips */}
            {(!story.audioClips || story.audioClips.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <MusicalNoteIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No audio clips have been attached to this story</p>
              </div>
            ) : (
              <div className="space-y-4">
                {story.audioClips.filter((clip: any) => !removedAudioIds.includes(clip.id)).map((clip: any) => (
                  <div key={clip.id} className="relative">
                    <CustomAudioPlayer
                      clip={{
                        id: clip.id,
                        url: clip.url,
                        originalName: clip.originalName,
                        description: clip.description,
                        duration: clip.duration,
                      }}
                      isPlaying={playingAudioId === clip.id}
                      currentTime={audioProgress[clip.id] || 0}
                      duration={audioDuration[clip.id] || 0}
                      onPlay={id => setPlayingAudioId(id)}
                      onStop={id => setPlayingAudioId(null)}
                      onRestart={id => setAudioProgress(prev => ({ ...prev, [id]: 0 }))}
                      onSeek={(id, t) => setAudioProgress(prev => ({ ...prev, [id]: t }))}
                      onTimeUpdate={(id, t) => setAudioProgress(prev => ({ ...prev, [id]: t }))}
                      onLoadedMetadata={(id, d) => setAudioDuration(prev => ({ ...prev, [id]: d }))}
                      onEnded={() => setPlayingAudioId(null)}
                      onError={() => setPlayingAudioId(null)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      color="red"
                      className="absolute top-2 right-2"
                      onClick={() => setRemovedAudioIds(ids => [...ids, clip.id])}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {/* Upload new audio files */}
            <div className="mt-6">
              <FileUpload
                onFilesChange={setAudioFiles}
                maxFiles={5}
                maxFileSize={50}
              />
            </div>
          </Card>

          <Divider />
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
      </div>
    </Container>
  );
} 