'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, DocumentTextIcon, LanguageIcon, GlobeAltIcon, MusicalNoteIcon, TrashIcon } from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { PageHeader } from '@/components/ui/page-header';
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Avatar } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { FileUpload } from '@/components/ui/file-upload';

interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
}

const translationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Translation content is required'),
});

type TranslationFormData = z.infer<typeof translationSchema>;

export default function TranslatePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const storyId = params.id as string;
  const [content, setContent] = useState('');

  // Audio clip state
  const [removedAudioIds, setRemovedAudioIds] = useState<string[]>([]);
  const [newAudioFiles, setNewAudioFiles] = useState<AudioFile[]>([]);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    trigger,
    control,
  } = useForm<TranslationFormData>({
    resolver: zodResolver(translationSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  // Fetch the translation story
  const { data: storyData, isLoading: storyLoading, error: storyError } = useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => {
      const res = await fetch(`/api/newsroom/stories/${storyId}`);
      if (!res.ok) throw new Error('Failed to fetch story');
      return res.json();
    },
    enabled: !!storyId,
  });

  const translationStory = storyData;

  // Fetch the original story
  const { data: originalStoryData, isLoading: originalLoading } = useQuery({
    queryKey: ['story', translationStory?.originalStoryId],
    queryFn: async () => {
      const res = await fetch(`/api/newsroom/stories/${translationStory.originalStoryId}`);
      if (!res.ok) throw new Error('Failed to fetch original story');
      return res.json();
    },
    enabled: !!translationStory?.originalStoryId,
  });

  const originalStory = originalStoryData;

  // Load existing translation content if it exists
  useEffect(() => {
    if (translationStory) {
      setValue('title', translationStory.title || '');
      setValue('content', translationStory.content || '');
      setContent(translationStory.content || '');
    }
  }, [translationStory, setValue]);

  // Sync RTE content with react-hook-form
  useEffect(() => {
    setValue('content', content);
    if (content !== '') trigger('content');
  }, [content, setValue, trigger]);

  // Audio handlers
  const handleAudioPlay = (audioId: string) => {
    setPlayingAudioId(playingAudioId === audioId ? null : audioId);
  };

  const handleAudioStop = () => {
    setPlayingAudioId(null);
  };

  const handleAudioRestart = (audioId: string) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: 0 }));
    setPlayingAudioId(audioId);
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

  const handleRemoveAudioClip = (audioId: string) => {
    setRemovedAudioIds(prev => [...prev, audioId]);
  };

  // Save translation mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TranslationFormData) => {
      let response;

      // If there are new audio files or removed audio clips, use FormData
      if (newAudioFiles.length > 0 || removedAudioIds.length > 0) {
        const formData = new FormData();

        // Add story data
        formData.append('title', data.title);
        formData.append('content', data.content);

        // Add removed audio IDs
        if (removedAudioIds.length > 0) {
          formData.append('removedAudioIds', JSON.stringify(removedAudioIds));
        }

        // Add new audio files
        newAudioFiles.forEach((audioFile, index) => {
          formData.append(`audioFile_${index}`, audioFile.file);
        });
        formData.append('audioFilesCount', String(newAudioFiles.length));

        response = await fetch(`/api/newsroom/stories/${storyId}`, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        // No audio changes, use regular JSON
        response = await fetch(`/api/newsroom/stories/${storyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            content: data.content,
          }),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save translation');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Translation saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      router.push(`/newsroom/stories/${storyId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save translation');
    },
  });

  const onSubmit = (data: TranslationFormData) => {
    saveMutation.mutate(data);
  };

  // Check permissions
  const isAuthorizedTranslator = translationStory?.authorId === session?.user?.id;

  if (status === 'loading' || storyLoading || originalLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <Text>Loading translation workspace...</Text>
        </div>
      </Container>
    );
  }

  if (storyError || !translationStory) {
    return (
      <Container>
        <div className="text-center py-12">
          <Text className="text-red-600">Error loading translation</Text>
          <Button onClick={() => router.push('/newsroom/stories')} className="mt-4">
            Back to Stories
          </Button>
        </div>
      </Container>
    );
  }

  // Check if this is actually a translation
  if (!translationStory.isTranslation) {
    return (
      <Container>
        <div className="text-center py-12">
          <Text className="text-red-600">This is not a translation story</Text>
          <Button onClick={() => router.push(`/newsroom/stories/${storyId}`)} className="mt-4">
            View Story
          </Button>
        </div>
      </Container>
    );
  }

  // Check authorization
  if (!isAuthorizedTranslator) {
    return (
      <Container>
        <div className="text-center py-12">
          <GlobeAltIcon className="h-16 w-16 text-red-300 dark:text-red-600 mx-auto mb-4" />
          <Heading level={3} className="text-red-600 mb-2">Access Denied</Heading>
          <Text className="text-gray-600 mb-4">
            Only the assigned translator can access this page.
          </Text>
          <Button onClick={() => router.push(`/newsroom/stories/${storyId}`)} className="mt-4">
            View Story Details
          </Button>
        </div>
      </Container>
    );
  }

  if (!originalStory) {
    return (
      <Container>
        <div className="text-center py-12">
          <Text>Loading original story...</Text>
        </div>
      </Container>
    );
  }

  // Calculate word counts
  const originalWordCount = originalStory.content
    .replace(/<[^>]*>/g, '')
    .split(/\s+/)
    .filter((word: string) => word.length > 0).length;

  const translationWordCount = content
    .replace(/<[^>]*>/g, '')
    .split(/\s+/)
    .filter((word: string) => word.length > 0).length;

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Translate Story"
          description={
            <div className="flex items-center gap-3 mt-2">
              <Badge color="blue">
                <LanguageIcon className="h-3 w-3 mr-1" />
                {originalStory.language} → {translationStory.language}
              </Badge>
              <span className="text-sm text-gray-500">
                Original: {originalWordCount} words
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">
                Translation: {translationWordCount} words
              </span>
            </div>
          }
          actions={
            <div className="flex items-center gap-3">
              <Button
                color="white"
                onClick={() => router.push(`/newsroom/stories/${storyId}`)}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Translation Form */}
          <div>
            <Card className="p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <Heading level={3}>
                  Your Translation
                </Heading>
                <Badge color="purple">
                  <GlobeAltIcon className="h-3 w-3 mr-1" />
                  {translationStory.language}
                </Badge>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Fieldset>
                  <FieldGroup>
                    <Field>
                      <Label htmlFor="title">Translated Title *</Label>
                      <Description>
                        Translate the title appropriately for {translationStory.language} audience
                      </Description>
                      <Input
                        id="title"
                        {...register('title')}
                        placeholder={`Enter ${translationStory.language} title...`}
                        invalid={!!errors.title}
                      />
                      {errors.title && (
                        <ErrorMessage>{errors.title.message}</ErrorMessage>
                      )}
                    </Field>

                    <Field>
                      <Label htmlFor="content">Translation Content *</Label>
                      <Description>
                        Translate the story content, adapting it culturally as needed
                      </Description>
                      <Controller
                        name="content"
                        control={control}
                        render={({ field }) => (
                          <RichTextEditor
                            content={field.value}
                            onChange={(val) => {
                              setContent(val);
                              field.onChange(val);
                            }}
                            placeholder="Write your translation here..."
                            className="min-h-[400px]"
                          />
                        )}
                      />
                      {errors.content && (
                        <ErrorMessage>{errors.content.message}</ErrorMessage>
                      )}
                    </Field>

                    {/* Audio Clips Management */}
                    <Field>
                      <Label>Audio Clips</Label>
                      <Description>
                        Manage audio clips for this translation. You can keep the original audio or upload new audio in {translationStory.language}.
                      </Description>

                      <div className="mt-3 space-y-4">
                        {/* Current Audio Clips */}
                        {translationStory.audioClips && translationStory.audioClips.length > 0 && (
                          <div className="space-y-3">
                            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Current Audio Clips ({translationStory.audioClips.filter((clip: any) => !removedAudioIds.includes(clip.id)).length})
                            </Text>
                            {translationStory.audioClips
                              .filter((clip: any) => !removedAudioIds.includes(clip.id))
                              .map((clip: any) => (
                                <div key={clip.id} className="relative">
                                  <CustomAudioPlayer
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
                                    onError={() => toast.error('Failed to play audio file')}
                                  />
                                  <Button
                                    type="button"
                                    color="red"
                                    className="absolute top-2 right-2"
                                    onClick={() => handleRemoveAudioClip(clip.id)}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Upload New Audio */}
                        <div>
                          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Upload New Audio (Optional)
                          </Text>
                          <FileUpload
                            onFilesChange={setNewAudioFiles}
                            maxFiles={5}
                            maxFileSize={50}
                          />
                        </div>
                      </div>
                    </Field>
                  </FieldGroup>
                </Fieldset>

                <Divider />

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    color="white"
                    onClick={() => router.push(`/newsroom/stories/${storyId}`)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    color="primary"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save Translation'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right: Original Story (Read-Only) */}
          <div>
            <Card className="p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <Heading level={3}>Original Story</Heading>
                <Badge color="blue">
                  <LanguageIcon className="h-3 w-3 mr-1" />
                  {originalStory.language}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <Heading level={4} className="text-xl mb-2">{originalStory.title}</Heading>
                  <div className="flex items-center gap-2">
                    <Avatar
                      className="h-6 w-6"
                      name={`${originalStory.author.firstName} ${originalStory.author.lastName}`}
                    />
                    <Text className="text-sm text-gray-600">
                      By {originalStory.author.firstName} {originalStory.author.lastName}
                    </Text>
                    {originalStory.category && (
                      <>
                        <span className="text-gray-400">•</span>
                        <Badge color="zinc">{originalStory.category.name}</Badge>
                      </>
                    )}
                  </div>
                </div>

                <Divider />

                <div className="prose max-w-none">
                  <div
                    className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{ __html: originalStory.content }}
                  />
                </div>

                <Divider />

                {/* Original Audio Clips */}
                {originalStory.audioClips && originalStory.audioClips.length > 0 && (
                  <>
                    <div>
                      <Heading level={4} className="text-md mb-2 flex items-center gap-2">
                        <MusicalNoteIcon className="h-5 w-5 text-gray-600" />
                        Original Audio Clips
                      </Heading>
                      <Text className="text-sm text-gray-500 mb-3">
                        Reference audio from the original story
                      </Text>
                      <div className="space-y-3">
                        {originalStory.audioClips.map((clip: any) => (
                          <CustomAudioPlayer
                            key={clip.id}
                            clip={clip}
                            isPlaying={playingAudioId === `original-${clip.id}`}
                            currentTime={audioProgress[`original-${clip.id}`] || 0}
                            duration={audioDuration[`original-${clip.id}`] || 0}
                            onPlay={(id) => handleAudioPlay(`original-${id}`)}
                            onStop={handleAudioStop}
                            onRestart={(id) => handleAudioRestart(`original-${id}`)}
                            onSeek={(id, time) => handleAudioSeek(`original-${id}`, time)}
                            onTimeUpdate={(id, time) => handleAudioTimeUpdate(`original-${id}`, time)}
                            onLoadedMetadata={(id, duration) => handleAudioLoadedMetadata(`original-${id}`, duration)}
                            onEnded={() => setPlayingAudioId(null)}
                            onError={() => toast.error('Failed to play audio file')}
                          />
                        ))}
                      </div>
                    </div>

                    <Divider />
                  </>
                )}

                <Button
                  color="white"
                  onClick={() => router.push(`/newsroom/stories/${originalStory.id}`)}
                >
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  View Full Original Story
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Container>
  );
}
