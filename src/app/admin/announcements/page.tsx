'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MegaphoneIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  targetAudience: 'ALL' | 'NEWSROOM' | 'RADIO';
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    staffRole: string;
  };
  _count: {
    dismissals: number;
  };
}

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch announcements
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-announcements', page],
    queryFn: async () => {
      const response = await fetch(`/api/admin/announcements?page=${page}&perPage=20`);
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return response.json();
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete announcement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) throw new Error('Failed to update announcement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
  });

  const announcements: Announcement[] = data?.announcements || [];
  const pagination = data?.pagination;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
      case 'MEDIUM':
        return <InformationCircleIcon className="h-4 w-4 text-amber-500" />;
      default:
        return <CheckCircleIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'red';
      case 'MEDIUM': return 'amber';
      default: return 'blue';
    }
  };

  const getTargetAudienceColor = (audience: string) => {
    switch (audience) {
      case 'ALL': return 'purple';
      case 'NEWSROOM': return 'blue';
      case 'RADIO': return 'green';
      default: return 'zinc';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the announcement "${title}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Failed to delete announcement');
      }
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await toggleActiveMutation.mutateAsync({ id, isActive });
    } catch (error) {
      console.error('Error updating announcement:', error);
      alert('Failed to update announcement');
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Announcements"
          description="Manage announcements for newsroom staff and radio stations"
          action={{
            label: "New Announcement",
            onClick: () => router.push('/admin/announcements/create')
          }}
        />

        {/* Stats Cards */}
        {announcements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 text-center">
              <div className="text-2xl font-bold text-zinc-900 mb-1">
                {announcements.length}
              </div>
              <Text className="text-zinc-600">Total</Text>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-2xl font-bold text-kelly-green mb-1">
                {announcements.filter(a => a.isActive).length}
              </div>
              <Text className="text-zinc-600">Active</Text>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-2xl font-bold text-red-500 mb-1">
                {announcements.filter(a => a.priority === 'HIGH').length}
              </div>
              <Text className="text-zinc-600">High Priority</Text>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-500 mb-1">
                {announcements.reduce((sum, a) => sum + a._count.dismissals, 0)}
              </div>
              <Text className="text-zinc-600">Total Views</Text>
            </Card>
          </div>
        )}

        {/* Announcements List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-zinc-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-zinc-200 rounded"></div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <Text className="text-red-600">Failed to load announcements</Text>
          </Card>
        ) : announcements.length === 0 ? (
          <Card className="p-12 text-center">
            <MegaphoneIcon className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
            <Heading level={3} className="text-zinc-500 mb-2">
              No announcements yet
            </Heading>
            <Text className="text-zinc-400 mb-6">
              Create your first announcement to communicate with your team.
            </Text>
            <Link href="/admin/announcements/create">
              <Button color="primary">
                Create Announcement
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getPriorityIcon(announcement.priority)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Heading level={4} className="text-lg font-semibold text-zinc-900">
                          {announcement.title}
                        </Heading>
                        <Badge color={getPriorityColor(announcement.priority)} className="text-xs">
                          {announcement.priority}
                        </Badge>
                        <Badge color={getTargetAudienceColor(announcement.targetAudience)} className="text-xs">
                          {announcement.targetAudience}
                        </Badge>
                        {!announcement.isActive && (
                          <Badge color="zinc" className="text-xs">
                            INACTIVE
                          </Badge>
                        )}
                      </div>
                      
                      <Text className="text-zinc-600 mb-3 line-clamp-2">
                        {announcement.message}
                      </Text>
                      
                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <div className="flex items-center gap-1">
                          <UsersIcon className="h-4 w-4" />
                          <span>By {announcement.author.firstName} {announcement.author.lastName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <EyeIcon className="h-4 w-4" />
                          <span>{announcement._count.dismissals} views</span>
                        </div>
                        <span>Created {formatDate(announcement.createdAt)}</span>
                        {announcement.expiresAt && (
                          <span>Expires {formatDate(announcement.expiresAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      outline
                      onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {announcement.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    
                    <Link href={`/admin/announcements/${announcement.id}/edit`}>
                      <Button outline>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                    
                    <Button
                      outline
                      onClick={() => handleDelete(announcement.id, announcement.title)}
                      disabled={deleteMutation.isPending}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            
            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  outline
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Text>
                  Page {page} of {pagination.totalPages}
                </Text>
                <Button
                  outline
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}