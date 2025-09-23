'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { UserForm } from '@/components/admin/UserForm';
import { userFormSchema, userCreateSchema } from '@/lib/validations';
import { z } from 'zod';

type UserFormData = z.infer<typeof userFormSchema>;
type UserCreateData = z.infer<typeof userCreateSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      // Transform frontend form data to backend API format
      const submitData: UserCreateData = {
        ...data,
        translationLanguage: data.translationLanguage === '' ? null : data.translationLanguage
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create user';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // API returns { user: userData, emailSent: boolean, message: string }
      if (result.user && result.user.id) {
        if (result.emailSent) {
          toast.success('User created successfully! Magic link email sent.');
        } else {
          toast.error('User created but email failed to send. User may need to be contacted manually.');
        }
        router.push(`/admin/users/${result.user.id}`);
      } else {
        // This should not happen with a successful API response
        console.error('Unexpected API response structure:', result);
        toast.error('User created but response was unexpected. Please check the user list.');
        router.push('/admin/users');
      }
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      toast.error(errorMessage);
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