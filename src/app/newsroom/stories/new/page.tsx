'use client';

import { useSession } from 'next-auth/react';
import { StoryCreateForm } from '@/components/newsroom/StoryCreateForm';

export default function NewStoryPage() {
  useSession();

  // Use the StoryCreateForm for all users - role-agnostic story creation
  return <StoryCreateForm />;
}