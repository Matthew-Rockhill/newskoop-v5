'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BulletinEditForm } from '@/components/newsroom/bulletins/BulletinEditForm';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function EditBulletinPage() {
  const params = useParams();
  const router = useRouter();
  const bulletinId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['bulletin', bulletinId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/bulletins/${bulletinId}`);
      if (!response.ok) throw new Error('Failed to fetch bulletin');
      return response.json();
    },
  });

  const bulletin = data?.bulletin;

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <Text className="mt-2 text-center text-gray-600">Loading bulletin...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-8">
        <Card className="p-8 text-center">
          <Text className="text-red-600">Error loading bulletin</Text>
          <Button outline onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </Card>
      </Container>
    );
  }

  if (!bulletin || bulletin.status !== 'DRAFT') {
    return (
      <Container className="py-8">
        <Card className="p-8 text-center">
          <Text className="text-red-600">
            {!bulletin ? 'Bulletin not found' : 'Only draft bulletins can be edited'}
          </Text>
          <Button outline onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          outline
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <PencilIcon className="h-8 w-8 text-[#76BD43]" />
          <div>
            <Heading level={1} className="text-3xl font-bold text-gray-900">
              Edit Bulletin
            </Heading>
            <Text className="text-gray-600">
              Modify your bulletin content and story selection
            </Text>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <BulletinEditForm
        bulletin={bulletin}
        onSuccess={(updatedBulletin) => {
          router.push(`/newsroom/bulletins/${updatedBulletin.id}`);
        }}
        onCancel={() => router.back()}
      />
    </Container>
  );
}