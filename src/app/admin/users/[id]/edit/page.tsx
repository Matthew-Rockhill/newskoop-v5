'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { UserEditForm } from '@/components/admin/UserEditForm';
import { UsersIcon } from '@heroicons/react/24/outline';

// Define User type locally
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string | null;
  userType: 'STAFF' | 'RADIO';
  staffRole?: 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'SUB_EDITOR' | 'JOURNALIST' | 'INTERN' | null;
  translationLanguage?: 'AFRIKAANS' | 'XHOSA' | null;
  isActive: boolean;
  isPrimaryContact: boolean;
  radioStationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  radioStation?: {
    id: string;
    name: string;
    province: string;
  } | null;
};

export default function UserEditPage() {
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/users/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchUser();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Loading user...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (error || !user) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {error || 'User not found'}
            </p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-8">
        <UserEditForm user={user} />
      </div>
    </Container>
  );
} 