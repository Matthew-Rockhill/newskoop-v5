'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { UserForm } from '@/components/admin/UserForm';
// Define the UserFormData type based on the form schema
type UserFormData = {
  email: string;
  firstName: string;
  lastName: string;
  userType: 'STAFF' | 'RADIO';
  isActive: boolean;
  mobileNumber?: string;
  staffRole?: 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'SUB_EDITOR' | 'JOURNALIST' | 'INTERN';
  translationLanguage?: 'AFRIKAANS' | 'XHOSA' | '';
};

export default function NewUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      // Clean up the data - convert empty string to undefined
      const submitData = {
        ...data,
        translationLanguage: data.translationLanguage === '' ? undefined : data.translationLanguage
      };
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
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