'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/page-header';
import { UserForm } from '@/components/admin/UserForm';
import { User } from '@/types/user';

export default function NewUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: User) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }

      const user = await response.json();
      router.push(`/admin/users/${user.id}`);
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <PageHeader
        title="Create New User"
        description="Add a new user to the system"
      />
      
      <div className="mt-8">
        <UserForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </Container>
  );
} 