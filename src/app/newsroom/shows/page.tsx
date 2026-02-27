'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ShowList } from '@/components/newsroom/shows/ShowList';
import { ShowForm } from '@/components/newsroom/shows/ShowForm';
import { useShows, useCreateShow, useUpdateShow, useDeleteShow, Show, CreateShowData, UpdateShowData } from '@/hooks/use-shows';
import { canManageShows, canDeleteShow as canDeleteShowPerm } from '@/lib/permissions';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function ShowsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.staffRole;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  const { data: showsData, isLoading } = useShows({ page: 1, perPage: 50, topLevelOnly: true });
  const createShow = useCreateShow();
  const updateShow = useUpdateShow();
  const deleteShow = useDeleteShow();

  const canManage = canManageShows(userRole as any);
  const canDelete = canDeleteShowPerm(userRole as any);

  const handleCreate = async (data: CreateShowData | UpdateShowData) => {
    try {
      await createShow.mutateAsync(data as CreateShowData);
      toast.success('Show created successfully');
      setIsCreateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create show');
    }
  };

  const handleUpdate = async (data: UpdateShowData) => {
    if (!selectedShow) return;

    try {
      await updateShow.mutateAsync({ id: selectedShow.id, data });
      toast.success('Show updated successfully');
      setIsEditModalOpen(false);
      setSelectedShow(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update show');
    }
  };

  const handleDelete = async () => {
    if (!selectedShow) return;

    try {
      await deleteShow.mutateAsync(selectedShow.id);
      toast.success('Show deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedShow(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete show');
    }
  };

  const openEditModal = (show: Show) => {
    setSelectedShow(show);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (show: Show) => {
    setSelectedShow(show);
    setIsDeleteModalOpen(true);
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Shows"
          description="Manage podcast-style shows and episodes"
          actions={
            canManage ? (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="w-5 h-5" />
                New Show
              </Button>
            ) : undefined
          }
        />

        <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-sm text-zinc-500">Loading shows...</p>
          </div>
        ) : (
          <ShowList
            shows={showsData?.shows || []}
            onEdit={canManage ? openEditModal : undefined}
            onDelete={canDelete ? openDeleteModal : undefined}
            canEdit={canManage}
            canDelete={canDelete}
          />
        )}
      </Card>
      </div>

      {/* Create Show Modal */}
      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="2xl">
        <DialogTitle>Create New Show</DialogTitle>
        <DialogDescription>
          Create a new podcast-style show. You can add episodes after creating the show.
        </DialogDescription>
        <DialogBody>
          <ShowForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateModalOpen(false)}
            isSubmitting={createShow.isPending}
          />
        </DialogBody>
      </Dialog>

      {/* Edit Show Modal */}
      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} size="2xl">
        <DialogTitle>Edit Show</DialogTitle>
        <DialogDescription>
          Update show details and settings.
        </DialogDescription>
        <DialogBody>
          {selectedShow && (
            <ShowForm
              show={selectedShow}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditModalOpen(false)}
              isSubmitting={updateShow.isPending}
            />
          )}
        </DialogBody>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Show"
        description={`Are you sure you want to delete "${selectedShow?.title}"? This action cannot be undone, and all episodes will also be deleted.`}
        confirmLabel="Delete Show"
        isPending={deleteShow.isPending}
      />
    </Container>
  );
}
