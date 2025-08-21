'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { BulletinCreateForm } from '@/components/newsroom/bulletins/BulletinCreateForm';
import { ArrowLeftIcon, NewspaperIcon } from '@heroicons/react/24/outline';

export default function CreateBulletinPage() {
  const router = useRouter();

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
          <NewspaperIcon className="h-8 w-8 text-[#76BD43]" />
          <div>
            <Heading level={1} className="text-3xl font-bold text-gray-900">
              Create News Bulletin
            </Heading>
            <Text className="text-gray-600">
              Create a new bulletin with curated stories for radio stations
            </Text>
          </div>
        </div>
      </div>

      {/* Form */}
      <BulletinCreateForm
        onSuccess={(bulletin) => {
          router.push(`/newsroom/bulletins/${bulletin.id}`);
        }}
        onCancel={() => router.back()}
      />
    </Container>
  );
}