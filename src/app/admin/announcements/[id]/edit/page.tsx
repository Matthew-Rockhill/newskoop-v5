'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardSkeleton } from '@/components/ui/skeleton';
import {
  MegaphoneIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be less than 2000 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  targetAudience: z.enum(['ALL', 'NEWSROOM', 'RADIO']),
  expiresAt: z.string().optional(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

export default function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: announcement, isLoading, error } = useQuery({
    queryKey: ['announcement', id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/announcements/${id}`);
      if (!response.ok) throw new Error('Failed to fetch announcement');
      return response.json();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    values: announcement ? {
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      targetAudience: announcement.targetAudience,
      expiresAt: announcement.expiresAt
        ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
        : '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          expiresAt: data.expiresAt || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update announcement');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement', id] });
      router.push('/admin/announcements');
    },
  });

  const onSubmit = async (data: AnnouncementFormData) => {
    try {
      setIsSubmitting(true);
      await updateMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error updating announcement:', error);
      alert(error instanceof Error ? error.message : 'Failed to update announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const messageLength = watch('message')?.length || 0;

  if (isLoading) {
    return (
      <Container className="py-8 max-w-4xl">
        <CardSkeleton count={1} lines={6} />
      </Container>
    );
  }

  if (error || !announcement) {
    return (
      <Container className="py-8 max-w-4xl">
        <Card className="p-8 text-center">
          <Text className="text-red-600">Announcement not found</Text>
          <Button outline onClick={() => router.push('/admin/announcements')} className="mt-4">
            Back to Announcements
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          outline
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <MegaphoneIcon className="h-8 w-8 text-kelly-green" />
          <div>
            <Heading level={1} className="text-3xl font-bold text-zinc-900">
              Edit Announcement
            </Heading>
            <Text className="text-zinc-600">
              Update announcement details
            </Text>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              {...register('title')}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-kelly-green focus:border-kelly-green"
              placeholder="Enter announcement title..."
            />
            {errors.title && (
              <Text className="text-red-600 text-sm mt-1">{errors.title.message}</Text>
            )}
          </div>

          {/* Priority and Target Audience Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Priority *
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-kelly-green focus:border-kelly-green"
              >
                <option value="LOW">Low - General information</option>
                <option value="MEDIUM">Medium - Important update</option>
                <option value="HIGH">High - Urgent announcement</option>
              </select>
              {errors.priority && (
                <Text className="text-red-600 text-sm mt-1">{errors.priority.message}</Text>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Target Audience *
              </label>
              <select
                {...register('targetAudience')}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-kelly-green focus:border-kelly-green"
              >
                <option value="ALL">Everyone - All users</option>
                <option value="NEWSROOM">Newsroom - Staff only</option>
                <option value="RADIO">Radio Stations - Station users only</option>
              </select>
              {errors.targetAudience && (
                <Text className="text-red-600 text-sm mt-1">{errors.targetAudience.message}</Text>
              )}
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Expiry Date (Optional)
            </label>
            <input
              type="datetime-local"
              {...register('expiresAt')}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-kelly-green focus:border-kelly-green"
            />
            <Text className="text-zinc-500 text-sm mt-1">
              Leave empty for announcement to remain active until manually deactivated
            </Text>
            {errors.expiresAt && (
              <Text className="text-red-600 text-sm mt-1">{errors.expiresAt.message}</Text>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Message *
            </label>
            <textarea
              {...register('message')}
              rows={6}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-kelly-green focus:border-kelly-green resize-vertical"
              placeholder="Enter your announcement message..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.message ? (
                <Text className="text-red-600 text-sm">{errors.message.message}</Text>
              ) : (
                <div />
              )}
              <Text className={`text-sm ${messageLength > 1800 ? 'text-red-600' : 'text-zinc-500'}`}>
                {messageLength}/2000 characters
              </Text>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button
              type="button"
              outline
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              disabled={isSubmitting}
              className="min-w-32"
            >
              {isSubmitting ? 'Saving...' : 'Update Announcement'}
            </Button>
          </div>
        </form>
      </Card>
    </Container>
  );
}
