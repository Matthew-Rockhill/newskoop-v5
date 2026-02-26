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
import { useShow, useCreateShow, CreateEpisodeData, CreateShowData, UpdateShowData, Show } from '@/hooks/use-shows';
import { useEpisodes, useCreateEpisode, useDeleteEpisode } from '@/hooks/use-episodes';
import { ShowForm } from '@/components/newsroom/shows/ShowForm';
import { canManageShows } from '@/lib/permissions';
import { PlusIcon, PencilIcon, TrashIcon, MusicalNoteIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
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

export default function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = session?.user?.staffRole;

  const [isCreateEpisodeModalOpen, setIsCreateEpisodeModalOpen] = useState(false);
  const [isCreateSubShowModalOpen, setIsCreateSubShowModalOpen] = useState(false);

  const { data: show, isLoading } = useShow(id);
  const { data: episodes } = useEpisodes(id);
  const createEpisode = useCreateEpisode();
  const createShow = useCreateShow();
  const deleteEpisode = useDeleteEpisode();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EpisodeFormData>({
    resolver: zodResolver(episodeSchema),
  });

  const canManage = canManageShows(userRole as any);

  const handleCreateEpisode = async (data: EpisodeFormData) => {
    try {
      await createEpisode.mutateAsync({ showId: id, data: data as CreateEpisodeData });
      toast.success('Episode created successfully');
      setIsCreateEpisodeModalOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create episode');
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    if (!confirm('Are you sure you want to delete this episode?')) return;

    try {
      await deleteEpisode.mutateAsync({ showId: id, episodeId });
      toast.success('Episode deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete episode');
    }
  };

  const handleCreateSubShow = async (data: CreateShowData | UpdateShowData) => {
    try {
      await createShow.mutateAsync({ ...data, parentId: id } as CreateShowData);
      toast.success('Sub-show created successfully');
      setIsCreateSubShowModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create sub-show');
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">Loading show...</p>
        </div>
      </Container>
    );
  }

  if (!show) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">Show not found</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* Parent breadcrumb */}
        {show.parent && (
          <Link
            href={`/newsroom/shows/${show.parent.id}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-kelly-green transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to {show.parent.title}
          </Link>
        )}

        <PageHeader
          title={show.title}
          description={show.description}
          actions={
            canManage ? (
              <div className="flex gap-2">
                <Button color="white" onClick={() => router.push(`/newsroom/shows/${id}/edit`)}>
                  <PencilIcon className="w-5 h-5" />
                  Edit Show
                </Button>
                <Button onClick={() => setIsCreateEpisodeModalOpen(true)}>
                  <PlusIcon className="w-5 h-5" />
                  New Episode
                </Button>
              </div>
            ) : undefined
          }
        />

        {/* Show Details Card */}
        <Card className="p-6">
        <div className="flex gap-6">
          {show.coverImage && (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-100">
              <Image
                src={show.coverImage}
                alt={show.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <Heading level={2}>{show.title}</Heading>
              <Badge color={show.isPublished ? 'green' : 'zinc'}>
                {show.isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>
            {show.description && (
              <Text className="text-zinc-600 mb-4">{show.description}</Text>
            )}
            <div className="flex gap-6 text-sm text-zinc-500">
              <div>
                <span className="font-medium">Episodes:</span> {episodes?.length || 0}
              </div>
              <div>
                <span className="font-medium">Created:</span>{' '}
                {formatDistanceToNow(new Date(show.createdAt), { addSuffix: true })}
              </div>
              <div>
                <span className="font-medium">By:</span> {show.createdBy.firstName} {show.createdBy.lastName}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Sub-Shows Section */}
      {show.subShows && show.subShows.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3}>Sub-Shows</Heading>
            {canManage && (
              <Button onClick={() => setIsCreateSubShowModalOpen(true)}>
                <PlusIcon className="w-5 h-5" />
                New Sub-Show
              </Button>
            )}
          </div>
          <Table striped>
            <TableHead>
              <TableRow>
                <TableHeader>Title</TableHeader>
                <TableHeader className="text-center">Episodes</TableHeader>
                <TableHeader className="text-center">Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {show.subShows.map((sub: Show) => (
                <TableRow
                  key={sub.id}
                  className="hover:bg-zinc-50 cursor-pointer"
                  onClick={() => router.push(`/newsroom/shows/${sub.id}`)}
                >
                  <TableCell className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{sub.title}</p>
                    {sub.description && (
                      <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">{sub.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-zinc-700">{sub._count?.episodes || 0}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <Badge color={sub.isPublished ? 'green' : 'zinc'}>
                      {sub.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Show "New Sub-Show" button if no sub-shows yet but this is a top-level show (no parent) */}
      {!show.parent && (!show.subShows || show.subShows.length === 0) && canManage && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Heading level={3}>Sub-Shows</Heading>
            <Button onClick={() => setIsCreateSubShowModalOpen(true)}>
              <PlusIcon className="w-5 h-5" />
              New Sub-Show
            </Button>
          </div>
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500">No sub-shows yet. Create one to organize content within this show.</p>
          </div>
        </Card>
      )}

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
                  onClick={() => router.push(`/newsroom/shows/${id}/episodes/${episode.id}`)}
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
                      <Button color="red" onClick={() => handleDeleteEpisode(episode.id)}>
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

      {/* Create Sub-Show Modal */}
      <Dialog open={isCreateSubShowModalOpen} onClose={() => setIsCreateSubShowModalOpen(false)} size="2xl">
        <DialogTitle>Create New Sub-Show</DialogTitle>
        <DialogDescription>
          Create a new sub-show under {show.title}
        </DialogDescription>
        <DialogBody>
          <ShowForm
            defaultParentId={id}
            onSubmit={handleCreateSubShow}
            onCancel={() => setIsCreateSubShowModalOpen(false)}
            isSubmitting={createShow.isPending}
          />
        </DialogBody>
      </Dialog>

      {/* Create Episode Modal */}
      <Dialog open={isCreateEpisodeModalOpen} onClose={() => setIsCreateEpisodeModalOpen(false)} size="2xl">
        <DialogTitle>Create New Episode</DialogTitle>
        <DialogDescription>
          Create a new episode for {show.title}
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
    </Container>
  );
}
