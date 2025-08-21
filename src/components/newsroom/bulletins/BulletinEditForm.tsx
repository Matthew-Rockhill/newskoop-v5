'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { StorySelector } from '@/components/newsroom/bulletins/StorySelector';
import { StoryList } from '@/components/newsroom/bulletins/StoryList';
import { BulletinPreview } from '@/components/newsroom/bulletins/BulletinPreview';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

const bulletinEditSchema = z.object({
  scheduleId: z.string().min(1, 'Please select a schedule'),
  scheduledDate: z.string().min(1, 'Please select a date'),
  intro: z.string().min(1, 'Introduction is required'),
  outro: z.string().min(1, 'Outro is required'),
});

type BulletinEditFormData = z.infer<typeof bulletinEditSchema>;

interface SelectedStory {
  id: string;
  title: string;
  content: string | null;
  audioUrl?: string;
  author: {
    firstName: string;
    lastName: string;
  };
  category: {
    name: string;
    slug: string;
  };
  tags: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
  publishedAt: string;
  order: number;
}

interface BulletinEditFormProps {
  bulletin: any;
  onSuccess: (bulletin: any) => void;
  onCancel: () => void;
}

export function BulletinEditForm({ bulletin, onSuccess, onCancel }: BulletinEditFormProps) {
  const queryClient = useQueryClient();
  const [selectedStories, setSelectedStories] = useState<SelectedStory[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'stories' | 'preview'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError,
  } = useForm<BulletinEditFormData>({
    resolver: zodResolver(bulletinEditSchema),
    defaultValues: {
      scheduleId: bulletin.scheduleId || '',
      scheduledDate: bulletin.scheduledFor ? new Date(bulletin.scheduledFor).toISOString().slice(0, 10) : '',
      intro: bulletin.intro || '',
      outro: bulletin.outro || '',
    },
  });

  const watchedScheduleId = watch('scheduleId');

  // Initialize selected stories from bulletin data
  useEffect(() => {
    if (bulletin.bulletinStories) {
      const stories = bulletin.bulletinStories
        .sort((a: any, b: any) => a.order - b.order)
        .map((bulletinStory: any) => ({
          id: bulletinStory.story.id,
          title: bulletinStory.story.title,
          content: bulletinStory.story.content,
          audioUrl: bulletinStory.story.audioUrl,
          author: bulletinStory.story.author,
          category: bulletinStory.story.category,
          tags: bulletinStory.story.tags?.map((storyTag: any) => ({
            id: storyTag.tag.id,
            name: storyTag.tag.name,
            category: storyTag.tag.category,
          })) || [],
          publishedAt: bulletinStory.story.publishedAt,
          order: bulletinStory.order,
        }));
      setSelectedStories(stories);
    }
  }, [bulletin]);

  // Fetch all active schedules
  const { data: schedulesData } = useQuery({
    queryKey: ['bulletin-schedules'],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/bulletins/schedules?active=true`);
      if (!response.ok) throw new Error('Failed to fetch schedules');
      return response.json();
    },
  });

  const schedules = schedulesData?.schedules || [];

  // Update selected schedule when schedule ID changes or schedules load
  useEffect(() => {
    if (watchedScheduleId && schedules.length > 0) {
      const schedule = schedules.find((s: any) => s.id === watchedScheduleId);
      setSelectedSchedule(schedule);
    } else if (bulletin.schedule) {
      setSelectedSchedule(bulletin.schedule);
    }
  }, [watchedScheduleId, schedules, bulletin.schedule]);

  // Update stories mutation
  const updateStoriesMutation = useMutation({
    mutationFn: async (stories: Array<{ storyId: string; order: number }>) => {
      const response = await fetch(`/api/newsroom/bulletins/${bulletin.id}/stories`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stories }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update stories');
      return result;
    },
  });

  // Update bulletin mutation
  const updateMutation = useMutation({
    mutationFn: async (data: BulletinEditFormData) => {
      const response = await fetch(`/api/newsroom/bulletins/${bulletin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update bulletin');
      return result;
    },
  });

  const onSubmit = async (data: BulletinEditFormData) => {
    try {
      setIsSubmitting(true);
      
      // Prepare stories data
      const stories = selectedStories.map((story, index) => ({
        storyId: story.id,
        order: index + 1,
      }));

      // Calculate scheduledFor by combining date and schedule time
      const [hours, minutes] = selectedSchedule?.time.split(':') || ['00', '00'];
      const scheduledDateTime = new Date(data.scheduledDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const submitData = {
        ...data,
        scheduledFor: scheduledDateTime.toISOString(),
      };

      // Update bulletin basic info first
      const bulletinResult = await updateMutation.mutateAsync(submitData);
      
      // Update stories separately
      await updateStoriesMutation.mutateAsync(stories);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['bulletin', bulletin.id] });
      queryClient.invalidateQueries({ queryKey: ['bulletins'] });

      onSuccess(bulletinResult.bulletin);
    } catch (error) {
      console.error('Error updating bulletin:', error);
      setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Failed to update bulletin',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStory = (story: any) => {
    // Check if story is already selected
    if (selectedStories.some(s => s.id === story.id)) {
      return;
    }

    const newStory: SelectedStory = {
      ...story,
      order: selectedStories.length + 1,
    };
    setSelectedStories([...selectedStories, newStory]);
  };

  const handleRemoveStory = (storyId: string) => {
    setSelectedStories(selectedStories.filter(s => s.id !== storyId));
  };

  const handleReorderStories = (reorderedStories: SelectedStory[]) => {
    const updatedStories = reorderedStories.map((story, index) => ({
      ...story,
      order: index + 1,
    }));
    setSelectedStories(updatedStories);
  };

  const tabs = [
    { id: 'form' as const, label: 'Basic Info', count: null },
    { id: 'stories' as const, label: 'Stories', count: selectedStories.length },
    { id: 'preview' as const, label: 'Preview', count: null },
  ];

  const canProceedToStories = watch('scheduleId') && watch('scheduledDate') && watch('intro') && watch('outro');
  const canPreview = canProceedToStories && selectedStories.length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Tab Navigation */}
      <Card className="p-4">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              disabled={
                (tab.id === 'stories' && !canProceedToStories) ||
                (tab.id === 'preview' && !canPreview)
              }
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-[#76BD43] text-[#76BD43]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                  activeTab === tab.id ? 'bg-[#76BD43] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </Card>

      {/* Form Tab */}
      {activeTab === 'form' && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <Heading level={2} className="text-xl font-semibold text-gray-900 mb-4">
                Edit Bulletin Schedule & Content
              </Heading>
              <Text className="text-gray-600">
                Update the bulletin schedule and content information.
              </Text>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bulletin Schedule *
                </label>
                <Select 
                  {...register('scheduleId')} 
                  data-invalid={!!errors.scheduleId}
                >
                  <option value="">Select a bulletin schedule...</option>
                  {schedules.map((schedule: any) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.title} - {schedule.language} ({schedule.time}) - {schedule.scheduleType.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
                {errors.scheduleId && (
                  <p className="text-red-600 text-sm mt-1">{errors.scheduleId.message}</p>
                )}
              </div>

              {selectedSchedule && (
                <Card className="p-4 bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full"></div>
                    <Text className="font-semibold text-gray-900">
                      {selectedSchedule.title}
                    </Text>
                    <Badge color="blue">
                      {selectedSchedule.language}
                    </Badge>
                    <Badge color="green">
                      {selectedSchedule.scheduleType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Text className="text-sm text-gray-600 ml-6">
                    Scheduled for {selectedSchedule.time} • Created by {selectedSchedule.creator?.firstName} {selectedSchedule.creator?.lastName}
                  </Text>
                </Card>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bulletin Date *
                </label>
                <Input
                  type="date"
                  {...register('scheduledDate')}
                  min={new Date().toISOString().slice(0, 10)}
                  data-invalid={!!errors.scheduledDate}
                />
                {errors.scheduledDate && (
                  <p className="text-red-600 text-sm mt-1">{errors.scheduledDate.message}</p>
                )}
                <Text className="text-xs text-gray-500 mt-1">
                  The bulletin will be scheduled for {selectedSchedule?.time || '[time]'} on this date
                </Text>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Introduction *
              </label>
              <RichTextEditor
                content={watch('intro')}
                onChange={(content) => setValue('intro', content)}
                placeholder="Write the introduction for your bulletin..."
                className="min-h-32"
              />
              {errors.intro && (
                <Text className="text-red-600 text-sm mt-1">{errors.intro.message}</Text>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outro *
              </label>
              <RichTextEditor
                content={watch('outro')}
                onChange={(content) => setValue('outro', content)}
                placeholder="Write the outro for your bulletin..."
                className="min-h-32"
              />
              {errors.outro && (
                <Text className="text-red-600 text-sm mt-1">{errors.outro.message}</Text>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setActiveTab('stories')}
                disabled={!canProceedToStories}
                className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white"
              >
                Next: Edit Stories
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stories Tab */}
      {activeTab === 'stories' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <Heading level={3} className="text-lg font-semibold text-gray-900 mb-4">
              Add Stories
            </Heading>
            <StorySelector
              language={selectedSchedule?.language || bulletin.language || 'ENGLISH'}
              selectedStoryIds={selectedStories.map(s => s.id)}
              onAddStory={handleAddStory}
            />
          </Card>

          <Card className="p-6">
            <Heading level={3} className="text-lg font-semibold text-gray-900 mb-4">
              Selected Stories ({selectedStories.length})
            </Heading>
            <StoryList
              stories={selectedStories}
              onRemove={handleRemoveStory}
              onReorder={handleReorderStories}
            />
            
            {selectedStories.length > 0 && (
              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white"
                >
                  Preview Changes
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Heading level={3} className="text-lg font-semibold text-gray-900">
              Updated Bulletin Preview
            </Heading>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setActiveTab('stories')}
                outline
              >
                Back to Stories
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white"
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <BulletinPreview
            title={selectedSchedule?.title || bulletin.title}
            intro={watch('intro')}
            outro={watch('outro')}
            language={selectedSchedule?.language || bulletin.language}
            stories={selectedStories}
            scheduledFor={(() => {
              const scheduledDate = watch('scheduledDate');
              if (scheduledDate && selectedSchedule?.time) {
                const [hours, minutes] = selectedSchedule.time.split(':');
                const dateTime = new Date(scheduledDate);
                dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                return dateTime.toISOString();
              }
              return undefined;
            })()}
            scheduleTitle={selectedSchedule?.title}
            scheduleTime={selectedSchedule?.time}
          />
        </Card>
      )}

      {/* Error Message */}
      {errors.root && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <Text className="text-red-600">{errors.root.message}</Text>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          outline
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        {activeTab !== 'preview' && (
          <Button
            type="submit"
            disabled={isSubmitting || !canPreview}
            className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white"
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        )}
      </div>
    </form>
  );
}