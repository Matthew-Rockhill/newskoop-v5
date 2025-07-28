'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { FileUpload } from '@/components/ui/file-upload';
import { Badge } from '@/components/ui/badge';
import { MusicalNoteIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Fieldset, FieldGroup, Field, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Divider } from '@/components/ui/divider';

import { InternEditForm } from '@/components/admin/InternEditForm';

// Define the story update schema
const storyUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
});

type StoryFormData = z.infer<typeof storyUpdateSchema>;

// Define types used in the component
interface AudioClip {
  id: string;
  url: string;
  originalName: string;
  description?: string;
  duration?: number;
}

interface Story {
  id: string;
  title: string;
  content: string;
  audioClips?: AudioClip[];
}

export default function EditStoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;

  // All hooks must be called unconditionally
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [story, setStory] = useState<Story | null>(null);
  const [content, setContent] = useState('');
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
        const storyData: Story = await response.json();
        setStory(storyData);
        setContent(storyData.content || '');
        reset({
          title: storyData.title,
          content: storyData.content,
        });
      } catch {
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
        const error: { error: string } = await response.json();
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
          <Button href="/admin/newsroom/stories" className="mt-4">
            Back to Stories
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
                {story.audioClips.filter((clip: AudioClip) => !removedAudioIds.includes(clip.id)).map((clip: AudioClip) => (
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
                      onPlay={() => setPlayingAudioId(clip.id)}
                      onStop={() => setPlayingAudioId(null)}
                      onRestart={() => setAudioProgress(prev => ({ ...prev, [clip.id]: 0 }))}
                      onSeek={(_, t) => setAudioProgress(prev => ({ ...prev, [clip.id]: t }))}
                      onTimeUpdate={(_, t) => setAudioProgress(prev => ({ ...prev, [clip.id]: t }))}
                      onLoadedMetadata={(_, d) => setAudioDuration(prev => ({ ...prev, [clip.id]: d }))}
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
                onFilesChange={() => {
                  // Note: Audio file handling would need to be implemented
                  toast.info('Audio file upload functionality needs to be implemented');
                }}
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