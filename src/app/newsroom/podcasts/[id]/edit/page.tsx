'use client';

import { use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { usePodcast, useUpdatePodcast, UpdatePodcastData, CreatePodcastData } from '@/hooks/use-podcasts';
import { PodcastForm } from '@/components/newsroom/podcasts/PodcastForm';
import { canManagePodcasts } from '@/lib/permissions';
import { toast } from 'react-hot-toast';

export default function EditPodcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = session?.user?.staffRole;
  const isProducer = session?.user?.isContentProducer;

  const { data: podcast, isLoading } = usePodcast(id);
  const updatePodcast = useUpdatePodcast();

  const canManage = canManagePodcasts(userRole as any, isProducer);

  const handleUpdate = async (data: CreatePodcastData | UpdatePodcastData) => {
    try {
      await updatePodcast.mutateAsync({ id, data: data as UpdatePodcastData });
      toast.success('Podcast updated successfully');
      router.push(`/newsroom/podcasts/${id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update podcast');
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

  if (!canManage) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">You do not have permission to edit podcasts</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title={`Edit: ${podcast.title}`}
        description="Update podcast details"
      />
      <Card className="p-6 mt-6">
        <PodcastForm
          podcast={podcast}
          onSubmit={handleUpdate}
          onCancel={() => router.push(`/newsroom/podcasts/${id}`)}
          isSubmitting={updatePodcast.isPending}
        />
      </Card>
    </Container>
  );
}
