'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PodcastList } from '@/components/newsroom/podcasts/PodcastList';
import { PodcastForm } from '@/components/newsroom/podcasts/PodcastForm';
import { usePodcasts, useCreatePodcast, useUpdatePodcast, useDeletePodcast, Podcast, CreatePodcastData, UpdatePodcastData } from '@/hooks/use-podcasts';
import { canManagePodcasts, canDeletePodcast as canDeletePodcastPerm } from '@/lib/permissions';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function PodcastsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.staffRole;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);

  const { data: podcastsData, isLoading } = usePodcasts({ page: 1, perPage: 50 });
  const createPodcast = useCreatePodcast();
  const updatePodcast = useUpdatePodcast();
  const deletePodcast = useDeletePodcast();

  const canManage = canManagePodcasts(userRole as any);
  const canDelete = canDeletePodcastPerm(userRole as any);

  const handleCreate = async (data: CreatePodcastData | UpdatePodcastData) => {
    try {
      await createPodcast.mutateAsync(data as CreatePodcastData);
      toast.success('Podcast created successfully');
      setIsCreateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create podcast');
    }
  };

  const handleUpdate = async (data: UpdatePodcastData) => {
    if (!selectedPodcast) return;

    try {
      await updatePodcast.mutateAsync({ id: selectedPodcast.id, data });
      toast.success('Podcast updated successfully');
      setIsEditModalOpen(false);
      setSelectedPodcast(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update podcast');
    }
  };

  const handleDelete = async () => {
    if (!selectedPodcast) return;

    try {
      await deletePodcast.mutateAsync(selectedPodcast.id);
      toast.success('Podcast deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedPodcast(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete podcast');
    }
  };

  const openEditModal = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setIsDeleteModalOpen(true);
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Podcasts"
          description="Manage podcasts and their episodes"
          actions={
            canManage ? (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="w-5 h-5" />
                New Podcast
              </Button>
            ) : undefined
          }
        />

        <Card className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-sm text-zinc-500">Loading podcasts...</p>
            </div>
          ) : (
            <PodcastList
              podcasts={podcastsData?.podcasts || []}
              onEdit={canManage ? openEditModal : undefined}
              onDelete={canDelete ? openDeleteModal : undefined}
              canEdit={canManage}
              canDelete={canDelete}
            />
          )}
        </Card>
      </div>

      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="2xl">
        <DialogTitle>Create New Podcast</DialogTitle>
        <DialogDescription>
          Create a new podcast. You can add episodes after creating the podcast.
        </DialogDescription>
        <DialogBody>
          <PodcastForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateModalOpen(false)}
            isSubmitting={createPodcast.isPending}
          />
        </DialogBody>
      </Dialog>

      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} size="2xl">
        <DialogTitle>Edit Podcast</DialogTitle>
        <DialogDescription>
          Update podcast details and settings.
        </DialogDescription>
        <DialogBody>
          {selectedPodcast && (
            <PodcastForm
              podcast={selectedPodcast}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditModalOpen(false)}
              isSubmitting={updatePodcast.isPending}
            />
          )}
        </DialogBody>
      </Dialog>

      <ConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Podcast"
        description={`Are you sure you want to delete "${selectedPodcast?.title}"? This action cannot be undone, and all episodes will also be deleted.`}
        confirmLabel="Delete Podcast"
        isPending={deletePodcast.isPending}
      />
    </Container>
  );
}
