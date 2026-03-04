'use client';

import { use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { useShow, useUpdateShow, UpdateShowData, CreateShowData } from '@/hooks/use-shows';
import { ShowForm } from '@/components/newsroom/shows/ShowForm';
import { canManageShows } from '@/lib/permissions';
import { toast } from 'react-hot-toast';

export default function EditShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = session?.user?.staffRole;

  const { data: show, isLoading } = useShow(id);
  const updateShow = useUpdateShow();

  const canManage = canManageShows(userRole as any);

  const handleUpdate = async (data: CreateShowData | UpdateShowData) => {
    try {
      await updateShow.mutateAsync({ id, data: data as UpdateShowData });
      toast.success('Show updated successfully');
      router.push(`/newsroom/shows/${id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update show');
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

  if (!canManage) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">You do not have permission to edit shows</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title={`Edit: ${show.title}`}
        description="Update show details"
      />
      <Card className="p-6 mt-6">
        <ShowForm
          show={show}
          onSubmit={handleUpdate}
          onCancel={() => router.push(`/newsroom/shows/${id}`)}
          isSubmitting={updateShow.isPending}
        />
      </Card>
    </Container>
  );
}
