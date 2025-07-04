'use client';

import { useSession } from 'next-auth/react';
import { InternStoryForm } from '@/components/admin/InternStoryForm';

export default function NewStoryPage() {
  const { data: session } = useSession();

  // Use the InternStoryForm for all users - we'll add role-based features later
  return <InternStoryForm />;
}