'use client';

import { useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Dialog, DialogTitle, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { usePodcast, CreatePodcastEpisodeData } from '@/hooks/use-podcasts';
import { usePodcastEpisodes, useCreatePodcastEpisode, useDeletePodcastEpisode } from '@/hooks/use-podcast-episodes';
import { canManagePodcasts } from '@/lib/permissions';
import { PlusIcon, PencilIcon, TrashIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const episodeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

type EpisodeFormData = z.infer<typeof episodeSchema>;

export default function PodcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = session?.user?.staffRole;

  const [isCreateEpisodeModalOpen, setIsCreateEpisodeModalOpen] = useState(false);
  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);

  const { data: podcast, isLoading } = usePodcast(id);
  const { data: episodes } = usePodcastEpisodes(id);
  const createEpisode = useCreatePodcastEpisode();
  const deleteEpisode = useDeletePodcastEpisode();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EpisodeFormData>({
    resolver: zodResolver(episodeSchema),
  });

  const canManage = canManagePodcasts(userRole as any);

  const handleCreateEpisode = async (data: EpisodeFormData) => {
    try {
      await createEpisode.mutateAsync({ podcastId: id, data: data as CreatePodcastEpisodeData });
      toast.success('Episode created successfully');
      setIsCreateEpisodeModalOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create episode');
    }
  };

  const handleDeleteEpisodeConfirm = async () => {
    if (!deleteEpisodeId) return;
    try {
      await deleteEpisode.mutateAsync({ podcastId: id, episodeId: deleteEpisodeId });
      toast.success('Episode deleted successfully');
      setDeleteEpisodeId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete episode');
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">Loading podcast...</p>
        </div>
      </Container>
    );
  }

  if (!podcast) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">Podcast not found</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title={podcast.title}
          description={podcast.description}
          actions={
            canManage ? (
              <div className="flex gap-2">
                <Button color="white" onClick={() => router.push(`/newsroom/podcasts/${id}/edit`)}>
                  <PencilIcon className="w-5 h-5" />
                  Edit Podcast
                </Button>
                <Button onClick={() => setIsCreateEpisodeModalOpen(true)}>
                  <PlusIcon className="w-5 h-5" />
                  New Episode
                </Button>
              </div>
            ) : undefined
          }
        />

        {/* Podcast Details Card */}
        <Card className="p-6">
          <div className="flex gap-6">
            {podcast.coverImage && (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-100">
                <Image
                  src={podcast.coverImage}
                  alt={podcast.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <Heading level={2}>{podcast.title}</Heading>
                <Badge color={podcast.isPublished ? 'green' : 'zinc'}>
                  {podcast.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
              {podcast.description && (
                <Text className="text-zinc-600 mb-4">{podcast.description}</Text>
              )}
              <div className="flex gap-6 text-sm text-zinc-500">
                <div>
                  <span className="font-medium">Episodes:</span> {episodes?.length || 0}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {formatDistanceToNow(new Date(podcast.createdAt), { addSuffix: true })}
                </div>
                <div>
                  <span className="font-medium">By:</span> {podcast.createdBy.firstName} {podcast.createdBy.lastName}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Episodes List */}
        <Card className="p-6">
          <Heading level={3} className="mb-4">Episodes</Heading>
          {!episodes || episodes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-zinc-500">No episodes yet</p>
              {canManage && (
                <Button className="mt-4" onClick={() => setIsCreateEpisodeModalOpen(true)}>
                  <PlusIcon className="w-5 h-5" />
                  Create First Episode
                </Button>
              )}
            </div>
          ) : (
            <Table striped>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-16">#</TableHeader>
                  <TableHeader>Title</TableHeader>
                  <TableHeader className="text-center">Status</TableHeader>
                  <TableHeader className="text-center">Audio</TableHeader>
                  <TableHeader>Published</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {episodes.map((episode) => (
                  <TableRow
                    key={episode.id}
                    className="hover:bg-zinc-50 cursor-pointer"
                    onClick={() => router.push(`/newsroom/podcasts/${id}/episodes/${episode.id}`)}
                  >
                    <TableCell className="px-4 py-3">
                      <span className="font-medium text-zinc-700">{episode.episodeNumber}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{episode.title}</p>
                      {episode.description && (
                        <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">{episode.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge color={episode.status === 'PUBLISHED' ? 'green' : episode.status === 'ARCHIVED' ? 'zinc' : 'yellow'}>
                        {episode.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      {episode.audioClips.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <MusicalNoteIcon className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-zinc-700">{episode.audioClips.length}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400">No audio</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {episode.publishedAt ? (
                        <span className="text-sm text-zinc-500">
                          {formatDistanceToNow(new Date(episode.publishedAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-sm text-zinc-400">Not published</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {canManage && (
                          <Button color="red" onClick={() => setDeleteEpisodeId(episode.id)}>
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Create Episode Modal */}
      <Dialog open={isCreateEpisodeModalOpen} onClose={() => setIsCreateEpisodeModalOpen(false)} size="2xl">
        <DialogTitle>Create New Episode</DialogTitle>
        <DialogDescription>
          Create a new episode for {podcast.title}
        </DialogDescription>
        <DialogBody>
          <form onSubmit={handleSubmit(handleCreateEpisode)} className="space-y-6">
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label>Title *</Label>
                  <Input {...register('title')} placeholder="Episode title" />
                  <Description>Slug will be automatically generated from the title</Description>
                  <ErrorMessage>{errors.title?.message}</ErrorMessage>
                </Field>

                <Field>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Episode description" rows={3} />
                  <ErrorMessage>{errors.description?.message}</ErrorMessage>
                </Field>
              </FieldGroup>
            </Fieldset>

            <div className="flex justify-end gap-3">
              <Button type="button" color="white" onClick={() => setIsCreateEpisodeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEpisode.isPending}>
                {createEpisode.isPending ? 'Creating...' : 'Create Episode'}
              </Button>
            </div>
          </form>
        </DialogBody>
      </Dialog>

      <ConfirmDialog
        open={!!deleteEpisodeId}
        onClose={() => setDeleteEpisodeId(null)}
        onConfirm={handleDeleteEpisodeConfirm}
        title="Delete Episode"
        description="Are you sure you want to delete this episode?"
        confirmLabel="Delete Episode"
        isPending={deleteEpisode.isPending}
      />
    </Container>
  );
}
