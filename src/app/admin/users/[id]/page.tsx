'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { UsersIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  radioStation?: {
    id: string;
    name: string;
    province: string;
  } | null;
};

const formatUserRole = (userType: string, staffRole?: string | null) => {
  if (userType === 'STAFF') {
    return staffRole || 'Staff';
  }
  return 'Radio Station User';
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!params.id) {
        setError('User ID is missing from URL');
        setIsLoading(false);
        return;
      }

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

  const handleSendPasswordReset = async () => {
    if (!user?.email || isSendingReset) return;
    
    setIsSendingReset(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (response.ok) {
        toast.success('Password reset email sent successfully!');
      } else {
        throw new Error('Failed to send password reset email');
      }
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send password reset email. Please try again.');
    } finally {
      setIsSendingReset(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-2 text-sm text-zinc-500">Loading user details...</p>
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
            <UsersIcon className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-2 text-sm text-zinc-500">
              {error || 'User not found'}
            </p>
            <Button 
              onClick={() => router.push('/admin/users')}
              className="mt-4"
              outline
            >
              Back to Users
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-8 space-y-6">
        <PageHeader
          title="User Details"
          action={{
            label: "Edit User",
            onClick: () => router.push(`/admin/users/${user.id}/edit`)
          }}
        />

        {/* User Information Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-start gap-4">
              <Avatar 
                name={`${user.firstName} ${user.lastName}`}
                className="size-16" 
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base/7 font-semibold text-zinc-900">
                    {user.firstName} {user.lastName}
                  </h3>
                  {user.isActive ? (
                    <Badge color="lime">Active</Badge>
                  ) : (
                    <Badge color="zinc">Inactive</Badge>
                  )}
                  {user.isPrimaryContact && (
                    <Badge color="blue">Primary Contact</Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-sm text-zinc-600">
                  <div>
                    Email: <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-500">
                      {user.email}
                    </a>
                  </div>
                  {user.mobileNumber && (
                    <div>Phone: {user.mobileNumber}</div>
                  )}
                  <div>Role: {formatUserRole(user.userType, user.staffRole)}</div>
                  {user.translationLanguage && (
                    <div>Translation Language: {user.translationLanguage}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Station Assignment Section */}
        {user.radioStation && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base/7 font-semibold text-zinc-900 mb-3">Station Assignment</h3>
              <div className="flex items-center gap-2">
                <Badge color="blue">{user.radioStation.name}</Badge>
                <span className="text-sm text-zinc-600">
                  {user.radioStation.province.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Account Information Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base/7 font-semibold text-zinc-900">Account Information</h3>
              <Button
                onClick={handleSendPasswordReset}
                disabled={isSendingReset}
                outline
                className="text-sm"
              >
                {isSendingReset ? 'Sending...' : 'Send Password Reset'}
              </Button>
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-zinc-500">Created</dt>
                <dd className="text-sm text-zinc-900">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500">Last Updated</dt>
                <dd className="text-sm text-zinc-900">{formatDate(user.updatedAt)}</dd>
              </div>
              {user.lastLoginAt && (
                <div>
                  <dt className="text-sm font-medium text-zinc-500">Last Login</dt>
                  <dd className="text-sm text-zinc-900">{formatDate(user.lastLoginAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </Container>
  );
} 