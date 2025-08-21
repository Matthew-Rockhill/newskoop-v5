'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PlusIcon,
  MegaphoneIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
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
    staffRole: string;
  };
  isDismissed: boolean;
}

export default function NewsroomAnnouncementsPage() {
  const [page, setPage] = useState(1);
  const [showDismissed, setShowDismissed] = useState(false);
  const queryClient = useQueryClient();

  // Fetch announcements
  const { data, isLoading, error } = useQuery({
    queryKey: ['newsroom-announcements', page],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/announcements?page=${page}&perPage=20`);
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return response.json();
    },
  });

  // Dismiss announcement mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/radio/announcements/${id}/dismiss`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to dismiss announcement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsroom-announcements'] });
    },
  });

  const announcements: Announcement[] = data?.announcements || [];
  const pagination = data?.pagination;

  // Filter announcements based on dismissed status
  const filteredAnnouncements = announcements.filter(announcement => 
    showDismissed ? announcement.isDismissed : !announcement.isDismissed
  );

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

  const handleDismiss = async (id: string) => {
    try {
      await dismissMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error dismissing announcement:', error);
      alert('Failed to dismiss announcement');
    }
  };

  const activeAnnouncements = announcements.filter(a => !a.isDismissed);
  const dismissedAnnouncements = announcements.filter(a => a.isDismissed);

  return (
    <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <MegaphoneIcon className="h-8 w-8 text-kelly-green" />
            <div>
              <Heading level={1} className="text-3xl font-bold text-gray-900">
                Announcements
              </Heading>
              <Text className="text-gray-600">
                Important updates and communications from management
              </Text>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              outline
              onClick={() => setShowDismissed(!showDismissed)}
              className="flex items-center gap-2"
            >
              {showDismissed ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
              {showDismissed ? 'Show Active' : 'Show Dismissed'}
            </Button>
            
            <Link href="/newsroom/announcements/create">
              <Button color="primary" className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                Create Announcement
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-kelly-green mb-1">
              {activeAnnouncements.length}
            </div>
            <Text className="text-gray-600">Active</Text>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-red-500 mb-1">
              {activeAnnouncements.filter(a => a.priority === 'HIGH').length}
            </div>
            <Text className="text-gray-600">High Priority</Text>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-gray-500 mb-1">
              {dismissedAnnouncements.length}
            </div>
            <Text className="text-gray-600">Dismissed</Text>
          </Card>
        </div>

        {/* Announcements List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <Text className="text-red-600">Failed to load announcements</Text>
          </Card>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="p-12 text-center">
            <MegaphoneIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <Heading level={3} className="text-gray-500 mb-2">
              {showDismissed ? 'No dismissed announcements' : 'No active announcements'}
            </Heading>
            <Text className="text-gray-400 mb-6">
              {showDismissed 
                ? 'You haven\'t dismissed any announcements yet.'
                : 'Check back later for important updates from management.'
              }
            </Text>
            {!showDismissed && (
              <Link href="/newsroom/announcements/create">
                <Button color="primary">
                  Create Announcement
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <Card 
                key={announcement.id} 
                className={`p-6 ${
                  announcement.priority === 'HIGH' && !announcement.isDismissed
                    ? 'border-l-4 border-l-red-500' 
                    : ''
                } ${
                  announcement.isDismissed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getPriorityIcon(announcement.priority)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Heading level={4} className="text-lg font-semibold text-gray-900">
                          {announcement.title}
                        </Heading>
                        <Badge color={getPriorityColor(announcement.priority)}>
                          {announcement.priority}
                        </Badge>
                        <Badge color={getTargetAudienceColor(announcement.targetAudience)}>
                          {announcement.targetAudience}
                        </Badge>
                        {announcement.isDismissed && (
                          <Badge color="zinc">
                            DISMISSED
                          </Badge>
                        )}
                      </div>
                      
                      <Text className="text-gray-600 mb-3 line-clamp-3">
                        {announcement.message}
                      </Text>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <UsersIcon className="h-4 w-4" />
                          <span>By {announcement.author.firstName} {announcement.author.lastName}</span>
                          <Badge color="zinc">
                            {announcement.author.staffRole}
                          </Badge>
                        </div>
                        <span>Created {formatDate(announcement.createdAt)}</span>
                        {announcement.expiresAt && (
                          <span>Expires {formatDate(announcement.expiresAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!announcement.isDismissed && (
                    <Button
                      outline
                      onClick={() => handleDismiss(announcement.id)}
                      disabled={dismissMutation.isPending}
                      className="flex items-center gap-1"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Dismiss
                    </Button>
                  )}
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
    </Container>
  );
}