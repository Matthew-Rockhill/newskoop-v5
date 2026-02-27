'use client';

import { useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileUpload } from '@/components/ui/file-upload';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useEpisode,
  useUpdateEpisode,
  useDeleteEpisode,
  useUploadEpisodeAudio,
  useDeleteEpisodeAudio,
  useLinkAudioToEpisode,
  usePublishEpisode,
  useUnpublishEpisode
} from '@/hooks/use-episodes';
import { AudioPickerModal } from '@/components/newsroom/AudioPickerModal';
import { canManageShows, canPublishEpisode } from '@/lib/permissions';
import { ArrowLeftIcon, TrashIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { formatDuration, formatFileSize } from '@/lib/format-utils';

// AudioFile type from FileUpload component
interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
}

const episodeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  content: z.string().optional(),
});

type EpisodeFormData = z.infer<typeof episodeSchema>;

export default function EpisodeDetailPage({
  params
}: {
  params: Promise<{ id: string; episodeId: string }>
}) {
  const { id: showId, episodeId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = session?.user?.staffRole;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [deleteAudioId, setDeleteAudioId] = useState<string | null>(null);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  const { data: episode, isLoading } = useEpisode(showId, episodeId);
  const updateEpisode = useUpdateEpisode();
  const deleteEpisode = useDeleteEpisode();
  const uploadAudio = useUploadEpisodeAudio();
  const deleteAudio = useDeleteEpisodeAudio();
  const linkAudio = useLinkAudioToEpisode(showId, episodeId);
  const publishEpisode = usePublishEpisode();
  const unpublishEpisode = useUnpublishEpisode();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EpisodeFormData>({
    resolver: zodResolver(episodeSchema),
    values: episode ? {
      title: episode.title,
      description: episode.description || '',
      content: episode.content || '',
    } : undefined,
  });

  const content = watch('content');
  const canManage = canManageShows(userRole as any);
  const canPublish = canPublishEpisode(userRole as any);

  const handleSave = async (data: EpisodeFormData) => {
    try {
      await updateEpisode.mutateAsync({
        showId,
        episodeId,
        data,
      });
      toast.success('Episode updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update episode');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEpisode.mutateAsync({ showId, episodeId });
      toast.success('Episode deleted successfully');
      router.push(`/newsroom/shows/${showId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete episode');
    }
  };

  const handleAudioUpload = async (audioFiles: AudioFile[]) => {
    try {
      // Extract File objects from AudioFile array
      const files = audioFiles.map(af => af.file);
      await uploadAudio.mutateAsync({ showId, episodeId, files });
      toast.success('Audio files uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload audio files');
    }
  };

  const handleLibraryLink = async (clipIds: string[]) => {
    try {
      await linkAudio.mutateAsync(clipIds);
      toast.success(`${clipIds.length} audio clip${clipIds.length !== 1 ? 's' : ''} attached from library`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to link audio clips');
    }
  };

  const handleAudioDeleteConfirm = async () => {
    if (!deleteAudioId) return;
    try {
      await deleteAudio.mutateAsync({ showId, episodeId, audioClipId: deleteAudioId });
      toast.success('Audio file deleted successfully');
      setDeleteAudioId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete audio file');
    }
  };

  const handlePublish = async () => {
    if (!episode?.audioClips || episode.audioClips.length === 0) {
      toast.error('Please upload at least one audio file before publishing');
      return;
    }

    try {
      await publishEpisode.mutateAsync({
        showId,
        episodeId,
        data: scheduledDate ? { scheduledPublishAt: scheduledDate } : {},
      });
      toast.success(scheduledDate ? 'Episode scheduled for publishing' : 'Episode published successfully');
      setIsPublishModalOpen(false);
      setScheduledDate('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish episode');
    }
  };

  const handleUnpublishConfirm = async () => {
    try {
      await unpublishEpisode.mutateAsync({ showId, episodeId });
      toast.success('Episode unpublished successfully');
      setShowUnpublishConfirm(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to unpublish episode');
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">Loading episode...</p>
        </div>
      </Container>
    );
  }

  if (!episode) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">Episode not found</p>
        </div>
      </Container>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'green';
      case 'ARCHIVED': return 'zinc';
      default: return 'yellow';
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title={`Episode ${episode.episodeNumber}: ${episode.title}`}
          description={
            <div className="flex items-center gap-4 mt-1">
              <Badge color={getStatusColor(episode.status)}>
                {episode.status}
              </Badge>
              {episode.publishedAt && (
                <Text className="text-sm">
                  Published {formatDistanceToNow(new Date(episode.publishedAt), { addSuffix: true })}
                </Text>
              )}
            </div>
          }
          actions={
            <div className="flex gap-2">
              <Button color="white" onClick={() => router.push(`/newsroom/shows/${showId}`)}>
                <ArrowLeftIcon className="w-5 h-5" />
                Back to Show
              </Button>
              {canManage && (
                <>
                  <Button
                    color="white"
                    onClick={handleSubmit(handleSave)}
                    disabled={!isDirty || updateEpisode.isPending}
                  >
                    {updateEpisode.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  {episode.status === 'PUBLISHED' && canPublish && (
                    <Button color="red" onClick={() => setShowUnpublishConfirm(true)}>
                      Unpublish
                    </Button>
                  )}
                  {episode.status !== 'PUBLISHED' && canPublish && (
                    <Button onClick={() => setIsPublishModalOpen(true)}>
                      Publish Episode
                    </Button>
                  )}
                  <Button color="red" onClick={() => setIsDeleteModalOpen(true)}>
                    <TrashIcon className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Episode Metadata */}
        <Card className="p-6">
          <Heading level={3} className="mb-4">Episode Details</Heading>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label>Title *</Label>
                  <Input {...register('title')} placeholder="Episode title" disabled={!canManage} />
                  <ErrorMessage>{errors.title?.message}</ErrorMessage>
                </Field>

                <Field>
                  <Label>Description</Label>
                  <Textarea
                    {...register('description')}
                    placeholder="Brief description of the episode"
                    rows={3}
                    disabled={!canManage}
                  />
                  <ErrorMessage>{errors.description?.message}</ErrorMessage>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <Label>Episode Number</Label>
                    <Input value={episode.episodeNumber} disabled />
                    <Description>Automatically assigned</Description>
                  </Field>

                  <Field>
                    <Label>Slug</Label>
                    <Input value={episode.slug} disabled />
                    <Description>Auto-generated from title</Description>
                  </Field>
                </div>
              </FieldGroup>
            </Fieldset>
          </form>
        </Card>

        {/* Show Notes */}
        <Card className="p-6">
          <Heading level={3} className="mb-4">Show Notes</Heading>
          <RichTextEditor
            content={content || ''}
            onChange={(newContent) => setValue('content', newContent, { shouldDirty: true })}
            placeholder="Write your show notes here..."
          />
        </Card>

        {/* Audio Files */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3}>Audio Files</Heading>
            {episode.duration && (
              <Badge color="zinc">
                Total Duration: {formatDuration(episode.duration)}
              </Badge>
            )}
          </div>

          {canManage && (
            <div className="mb-6 space-y-4">
              <FileUpload
                onFilesChange={handleAudioUpload}
                acceptedTypes={['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4']}
                maxFiles={5}
                maxFileSize={50}
                existingCount={episode.audioClips?.length || 0}
              />
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-zinc-200" />
                <span className="text-sm text-zinc-400">or</span>
                <div className="flex-1 border-t border-zinc-200" />
              </div>
              <Button
                type="button"
                color="white"
                onClick={() => setShowAudioPicker(true)}
              >
                <MusicalNoteIcon className="w-5 h-5" />
                Browse Audio Library
              </Button>
            </div>
          )}

          {episode.audioClips && episode.audioClips.length > 0 ? (
            <div className="space-y-4">
              {episode.audioClips.map((clip) => (
                <div key={clip.id} className="space-y-2">
                  <CustomAudioPlayer
                    clip={{ ...clip, duration: clip.duration ?? null }}
                    onError={() => toast.error('Failed to play audio file')}
                  />
                  <div className="flex items-center justify-between text-sm text-zinc-500 px-2">
                    <div className="flex items-center gap-4">
                      <span>Size: {formatFileSize(clip.fileSize)}</span>
                      <span>
                        Uploaded {formatDistanceToNow(new Date(clip.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {canManage && (
                      <Button
                        color="red"
                        onClick={() => setDeleteAudioId(clip.id)}
                        disabled={deleteAudio.isPending}
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
              <MusicalNoteIcon className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <p className="text-sm text-zinc-500">No audio files uploaded yet</p>
              {canManage && (
                <p className="text-xs text-zinc-400 mt-1">
                  Upload at least one audio file to publish this episode
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Publishing Info */}
        {episode.status === 'PUBLISHED' && (
          <Card className="p-6">
            <Heading level={3} className="mb-4">Publishing Information</Heading>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Status:</span>
                <Badge color="green">Published</Badge>
              </div>
              {episode.publishedAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Published:</span>
                  <span className="text-zinc-900 dark:text-white">
                    {new Date(episode.publishedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {episode.publisher && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Published by:</span>
                  <span className="text-zinc-900 dark:text-white">
                    {episode.publisher.firstName} {episode.publisher.lastName}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Episode"
        description="Are you sure you want to delete this episode? This action cannot be undone, and all audio files will also be deleted."
        confirmLabel="Delete Episode"
        isPending={deleteEpisode.isPending}
      />

      {/* Publish Modal */}
      <Dialog open={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)}>
        <DialogTitle>Publish Episode</DialogTitle>
        <DialogDescription>
          Choose whether to publish immediately or schedule for later.
        </DialogDescription>
        <DialogBody>
          <Field>
            <Label>Schedule Publish Date (optional)</Label>
            <Input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
            <Description>Leave empty to publish immediately</Description>
          </Field>
        </DialogBody>
        <DialogActions>
          <Button color="white" onClick={() => setIsPublishModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={publishEpisode.isPending}>
            {publishEpisode.isPending ? 'Publishing...' : scheduledDate ? 'Schedule' : 'Publish Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Audio Confirmation */}
      <ConfirmDialog
        open={!!deleteAudioId}
        onClose={() => setDeleteAudioId(null)}
        onConfirm={handleAudioDeleteConfirm}
        title="Delete Audio File"
        description="Are you sure you want to delete this audio file?"
        isPending={deleteAudio.isPending}
      />

      {/* Unpublish Confirmation */}
      <ConfirmDialog
        open={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={handleUnpublishConfirm}
        title="Unpublish Episode"
        description="Are you sure you want to unpublish this episode?"
        confirmLabel="Unpublish"
        isPending={unpublishEpisode.isPending}
        variant="warning"
      />

      {/* Audio Library Picker Modal */}
      <AudioPickerModal
        isOpen={showAudioPicker}
        onClose={() => setShowAudioPicker(false)}
        onConfirm={handleLibraryLink}
        excludeClipIds={episode?.audioClips?.map(c => c.id) || []}
        isLoading={linkAudio.isPending}
      />
    </Container>
  );
}
