'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Container } from '@/components/ui/container';
import { StoryEditForm } from '@/components/newsroom/StoryEditForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function EditStoryPage() {
  const { status } = useSession();
  const params = useParams();
  const storyId = params.id as string;

  // Show loading while session is loading
  if (status === 'loading') {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  // Use unified edit form for all roles
  return <StoryEditForm storyId={storyId} />;
}
