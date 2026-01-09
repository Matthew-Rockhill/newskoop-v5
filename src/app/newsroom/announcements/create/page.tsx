'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export default function CreateNewsroomAnnouncementPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = session?.user?.staffRole && ['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      priority: 'MEDIUM',
      targetAudience: 'NEWSROOM',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      const response = await fetch('/api/newsroom/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create announcement');
      }
      return response.json();
    },
    onSuccess: () => {
      router.push('/newsroom/announcements');
    },
  });

  const onSubmit = async (data: AnnouncementFormData) => {
    try {
      setIsSubmitting(true);
      await createMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert(error instanceof Error ? error.message : 'Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const messageLength = watch('message')?.length || 0;

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
                Create Announcement
              </Heading>
              <Text className="text-zinc-600">
                Communicate important information to your team or radio stations
              </Text>
            </div>
          </div>
        </div>

        {/* Permission Notice */}
        {!isAdmin && (
          <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2">
              <MegaphoneIcon className="h-5 w-5 text-amber-600" />
              <Text className="text-amber-800">
                As an editor, you can create medium priority announcements. Only admins can create high priority announcements.
              </Text>
            </div>
          </Card>
        )}

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
                  disabled={!isAdmin}
                >
                  <option value="LOW">Low - General information</option>
                  <option value="MEDIUM">Medium - Important update</option>
                  {isAdmin && (
                    <option value="HIGH">High - Urgent announcement</option>
                  )}
                </select>
                {errors.priority && (
                  <Text className="text-red-600 text-sm mt-1">{errors.priority.message}</Text>
                )}
                {!isAdmin && (
                  <Text className="text-zinc-500 text-sm mt-1">
                    Only admins can create high priority announcements
                  </Text>
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
                  <option value="NEWSROOM">Newsroom - Staff only</option>
                  <option value="ALL">Everyone - All users</option>
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
                min={new Date().toISOString().slice(0, 16)}
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
                {isSubmitting ? 'Creating...' : 'Create Announcement'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Preview Card */}
        {watch('title') && (
          <Card className="mt-6 p-6 bg-zinc-50">
            <Heading level={3} className="text-lg font-semibold text-zinc-900 mb-4">
              Preview
            </Heading>
            <div className={`bg-white p-4 rounded-lg border ${
              watch('priority') === 'HIGH' ? 'border-l-4 border-l-red-500' : ''
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <MegaphoneIcon className="h-4 w-4 text-kelly-green flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Text className="font-semibold text-zinc-900">{watch('title')}</Text>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      watch('priority') === 'HIGH' ? 'bg-red-100 text-red-800' :
                      watch('priority') === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {watch('priority')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      watch('targetAudience') === 'ALL' ? 'bg-purple-100 text-purple-800' :
                      watch('targetAudience') === 'NEWSROOM' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {watch('targetAudience')}
                    </span>
                  </div>
                  <Text className="text-zinc-600">{watch('message') || 'Your message will appear here...'}</Text>
                  <div className="mt-2 text-xs text-zinc-500">
                    By {session?.user?.firstName} {session?.user?.lastName} • {session?.user?.staffRole}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
    </Container>
  );
}