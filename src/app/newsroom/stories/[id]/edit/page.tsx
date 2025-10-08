'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Container } from '@/components/ui/container';
import { StoryEditForm } from '@/components/newsroom/StoryEditForm';

export default function EditStoryPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const storyId = params.id as string;

  // Show loading while session is loading
  if (status === 'loading') {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading...</p>
        </div>
      </Container>
    );
  }

  // Use unified edit form for all roles
  return <StoryEditForm storyId={storyId} />;
}
