'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StorySelector } from '@/components/newsroom/bulletins/StorySelector';
import { StoryList } from '@/components/newsroom/bulletins/StoryList';
import { BulletinPreview } from '@/components/newsroom/bulletins/BulletinPreview';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import {
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  QueueListIcon,
  EyeIcon,
  CheckIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';

// Dynamically import RichTextEditor to reduce initial bundle size
const RichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })),
  {
    loading: () => <div className="border border-zinc-300 rounded-lg p-4 min-h-[200px] animate-pulse bg-zinc-50">Loading editor...</div>,
    ssr: false
  }
);

const bulletinSchema = z.object({
  scheduleId: z.string().min(1, 'Please select a schedule'),
  scheduledDate: z.string().min(1, 'Please select a date'),
  intro: z.string().min(1, 'Introduction is required'),
  outro: z.string().min(1, 'Outro is required'),
});

type BulletinFormData = z.infer<typeof bulletinSchema>;

interface SelectedStory {
  id: string;
  title: string;
  content: string | null;
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
  }>;
  publishedAt: string;
  order: number;
  audioClips?: Array<{
    id: string;
    url: string;
    duration: number | null;
    originalName?: string;
    mimeType?: string;
  }>;
}

interface BulletinCreateFormProps {
  onSuccess: (bulletin: any) => void;
  onCancel: () => void;
}

const steps = [
  { id: 1, name: 'Schedule', description: 'Select schedule and date', icon: CalendarIcon },
  { id: 2, name: 'Stories', description: 'Choose stories to include', icon: DocumentTextIcon },
  { id: 3, name: 'Order', description: 'Arrange story order', icon: QueueListIcon },
  { id: 4, name: 'Content', description: 'Write intro and outro', icon: ClockIcon },
  { id: 5, name: 'Preview', description: 'Review and create', icon: EyeIcon },
];

export function BulletinCreateForm({ onSuccess, onCancel }: BulletinCreateFormProps) {
  const [selectedStories, setSelectedStories] = useState<SelectedStory[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError,
  } = useForm<BulletinFormData>({
    resolver: zodResolver(bulletinSchema),
    defaultValues: {
      scheduleId: '',
      scheduledDate: '',
      intro: '',
      outro: '',
    },
  });

  const watchedScheduleId = watch('scheduleId');
  const watchedScheduledDate = watch('scheduledDate');
  const watchedIntro = watch('intro');
  const watchedOutro = watch('outro');

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

  // Update selected schedule when schedule ID changes
  useEffect(() => {
    if (watchedScheduleId) {
      const schedule = schedules.find((s: any) => s.id === watchedScheduleId);
      setSelectedSchedule(schedule);
    } else {
      setSelectedSchedule(null);
    }
  }, [watchedScheduleId, schedules]);

  // Clear stories when language changes (schedule change)
  useEffect(() => {
    if (selectedSchedule && selectedStories.length > 0) {
      // Check if any story's language doesn't match the schedule's language
      const mismatchedStories = selectedStories.some(story => {
        const languageTag = story.tags.find((t: any) => t.category === 'LANGUAGE');
        return languageTag && languageTag.name !== selectedSchedule.language;
      });

      if (mismatchedStories) {
        setSelectedStories([]);
      }
    }
  }, [selectedSchedule?.id]);

  // Create bulletin mutation
  const createMutation = useMutation({
    mutationFn: async (data: BulletinFormData & { stories: Array<{ storyId: string; order: number }> }) => {
      const response = await fetch('/api/newsroom/bulletins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create bulletin');
      return result;
    },
  });

  const onSubmit = async (data: BulletinFormData) => {
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
        title: selectedSchedule?.title || `${selectedSchedule?.scheduleType} Bulletin`,
        language: selectedSchedule?.language,
        scheduledFor: scheduledDateTime.toISOString(),
        stories,
      };

      const result = await createMutation.mutateAsync(submitData);
      onSuccess(result.bulletin);
    } catch (error) {
      console.error('Error creating bulletin:', error);
      setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Failed to create bulletin',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStory = (story: any) => {
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

  // Step validation logic
  const canProceedToStep = (step: number): boolean => {
    switch (step) {
      case 2: return !!watchedScheduleId && !!watchedScheduledDate;
      case 3: return selectedStories.length > 0;
      case 4: return selectedStories.length > 0;
      case 5: return !!(watchedIntro?.trim()) && !!(watchedOutro?.trim());
      default: return true;
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return !!watchedScheduleId && !!watchedScheduledDate;
      case 2: return selectedStories.length > 0;
      case 3: return selectedStories.length > 0;
      case 4: return !!(watchedIntro?.trim()) && !!(watchedOutro?.trim());
      case 5: return false; // Preview is never "complete" until submitted
      default: return false;
    }
  };

  const goToNextStep = () => {
    if (currentStep < 5 && canProceedToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    // Can always go back
    if (step < currentStep) {
      setCurrentStep(step);
      return;
    }
    // Can only go forward if previous steps are complete
    for (let i = currentStep; i < step; i++) {
      if (!canProceedToStep(i + 1)) {
        return;
      }
    }
    setCurrentStep(step);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Step Progress Indicator */}
      <Card className="p-6">
        <nav aria-label="Progress">
          <ol className="flex items-start">
            {steps.map((step, stepIdx) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isComplete = isStepComplete(step.id) && currentStep > step.id;
              const canAccess = step.id <= currentStep || canProceedToStep(step.id);
              const isLastStep = stepIdx === steps.length - 1;

              return (
                <li key={step.id} className={`relative ${isLastStep ? '' : 'flex-1'}`}>
                  <div className="flex items-center">
                    {/* Step circle */}
                    <button
                      type="button"
                      onClick={() => canAccess && goToStep(step.id)}
                      disabled={!canAccess}
                      className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        canAccess ? 'cursor-pointer' : 'cursor-not-allowed'
                      } ${
                        isActive
                          ? 'border-kelly-green bg-kelly-green text-white'
                          : isComplete
                          ? 'border-kelly-green bg-kelly-green text-white'
                          : canAccess
                          ? 'border-zinc-300 bg-white text-zinc-500 hover:border-kelly-green/50'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-300'
                      }`}
                    >
                      {isComplete ? (
                        <CheckIcon className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </button>

                    {/* Connector line */}
                    {!isLastStep && (
                      <div
                        className={`h-0.5 flex-1 mx-2 ${
                          isComplete || (currentStep > step.id)
                            ? 'bg-kelly-green'
                            : 'bg-zinc-200'
                        }`}
                      />
                    )}
                  </div>

                  {/* Step label - positioned below */}
                  <div className="mt-2">
                    <span
                      className={`text-xs font-medium whitespace-nowrap ${
                        isActive
                          ? 'text-kelly-green'
                          : isComplete
                          ? 'text-kelly-green'
                          : canAccess
                          ? 'text-zinc-600'
                          : 'text-zinc-300'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </Card>

      {/* Step 1: Schedule & Date */}
      {currentStep === 1 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <Heading level={2} className="text-xl font-semibold text-zinc-900 mb-2">
                Select Schedule & Date
              </Heading>
              <Text className="text-zinc-600">
                Choose the bulletin schedule and the date for this bulletin.
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
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
                {schedules.length === 0 && (
                  <Text className="text-sm text-amber-600 mt-1">
                    No active schedules found. Please create a schedule first.
                  </Text>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
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
                {selectedSchedule && (
                  <Text className="text-xs text-zinc-500 mt-1">
                    Bulletin will be scheduled for {selectedSchedule.time} on this date
                  </Text>
                )}
              </div>
            </div>

            {selectedSchedule && (
              <Card className="p-4 bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full"></div>
                  <Text className="font-semibold text-zinc-900">
                    {selectedSchedule.title}
                  </Text>
                  <Badge color="blue">
                    {selectedSchedule.language}
                  </Badge>
                  <Badge color="green">
                    {selectedSchedule.scheduleType.replace('_', ' ')}
                  </Badge>
                </div>
                <Text className="text-sm text-zinc-600 ml-6">
                  Created by {selectedSchedule.creator?.firstName} {selectedSchedule.creator?.lastName}
                </Text>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                outline
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={!canProceedToStep(2)}
                className="bg-kelly-green hover:bg-kelly-green/90 text-white"
              >
                Next: Select Stories
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Select Stories */}
      {currentStep === 2 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Heading level={2} className="text-xl font-semibold text-zinc-900 mb-2">
                  Select Stories
                </Heading>
                <Text className="text-zinc-600">
                  Choose the stories to include in your bulletin. Stories are filtered by the schedule&apos;s language ({selectedSchedule?.language}).
                </Text>
              </div>
              <Badge color="green" className="text-lg px-4 py-2">
                {selectedStories.length} selected
              </Badge>
            </div>

            <StorySelector
              language={selectedSchedule?.language || 'ENGLISH'}
              selectedStoryIds={selectedStories.map(s => s.id)}
              onAddStory={handleAddStory}
            />

            {selectedStories.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <Text className="text-sm text-green-800">
                  <strong>{selectedStories.length}</strong> {selectedStories.length === 1 ? 'story' : 'stories'} selected.
                  Click Next to arrange them in the desired order.
                </Text>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                outline
                onClick={goToPreviousStep}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={!canProceedToStep(3)}
                className="bg-kelly-green hover:bg-kelly-green/90 text-white"
              >
                Next: Order Stories
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Order Stories */}
      {currentStep === 3 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <Heading level={2} className="text-xl font-semibold text-zinc-900 mb-2">
                Order Stories
              </Heading>
              <Text className="text-zinc-600">
                Drag and drop to arrange stories in the order they should appear in the bulletin.
                You can also remove stories if needed.
              </Text>
            </div>

            <StoryList
              stories={selectedStories}
              onRemove={handleRemoveStory}
              onReorder={handleReorderStories}
            />

            {selectedStories.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <Text className="text-sm text-amber-800">
                  All stories have been removed. Go back to add more stories.
                </Text>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                outline
                onClick={goToPreviousStep}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={!canProceedToStep(4)}
                className="bg-kelly-green hover:bg-kelly-green/90 text-white"
              >
                Next: Write Intro & Outro
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Intro & Outro */}
      {currentStep === 4 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <Heading level={2} className="text-xl font-semibold text-zinc-900 mb-2">
                Write Introduction & Outro
              </Heading>
              <Text className="text-zinc-600">
                Write the opening and closing text for your bulletin with {selectedStories.length} {selectedStories.length === 1 ? 'story' : 'stories'}.
              </Text>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="zinc">Intro</Badge>
                <span className="text-sm text-red-500">*</span>
              </div>
              <Text className="text-xs text-zinc-500 mb-2">
                This text will appear at the beginning of the bulletin before any stories.
              </Text>
              <RichTextEditor
                content={watchedIntro}
                onChange={(content) => setValue('intro', content)}
                placeholder="Write the introduction for your bulletin..."
                className="min-h-32"
              />
              {errors.intro && (
                <Text className="text-red-600 text-sm mt-1">{errors.intro.message}</Text>
              )}
            </div>

            {/* Selected Stories - Preview Style */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Heading level={3} className="text-sm font-semibold text-zinc-800 uppercase tracking-wide">
                  Stories
                </Heading>
                <Badge color="zinc">{selectedStories.length}</Badge>
              </div>

              <div className="space-y-4">
                {selectedStories.map((story, index) => (
                  <div key={story.id} className="border border-zinc-200 rounded-lg p-4 bg-white">
                    {/* Story Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge color="zinc">Story {index + 1}</Badge>
                      <Badge color="green">{story.category.name}</Badge>
                      {story.audioClips && story.audioClips.length > 0 && (
                        <Badge color="purple" className="flex items-center gap-1">
                          <SpeakerWaveIcon className="h-3 w-3" />
                          Audio
                        </Badge>
                      )}
                    </div>

                    {/* Story Content */}
                    <div className="prose prose-sm max-w-none text-zinc-700">
                      {story.content ? (
                        <div dangerouslySetInnerHTML={{ __html: story.content }} />
                      ) : (
                        <p className="text-zinc-500 italic">No content available</p>
                      )}
                    </div>

                    {/* Audio Clips */}
                    {story.audioClips && story.audioClips.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {story.audioClips.map((clip) => (
                          <CustomAudioPlayer
                            key={clip.id}
                            clip={{
                              id: clip.id,
                              url: clip.url,
                              originalName: clip.originalName || 'Audio',
                              duration: clip.duration,
                              mimeType: clip.mimeType || 'audio/mpeg',
                            }}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="zinc">Outro</Badge>
                <span className="text-sm text-red-500">*</span>
              </div>
              <Text className="text-xs text-zinc-500 mb-2">
                This text will appear at the end of the bulletin after all stories.
              </Text>
              <RichTextEditor
                content={watchedOutro}
                onChange={(content) => setValue('outro', content)}
                placeholder="Write the outro for your bulletin..."
                className="min-h-32"
              />
              {errors.outro && (
                <Text className="text-red-600 text-sm mt-1">{errors.outro.message}</Text>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                outline
                onClick={goToPreviousStep}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={!canProceedToStep(5)}
                className="bg-kelly-green hover:bg-kelly-green/90 text-white"
              >
                Next: Preview
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 5: Preview */}
      {currentStep === 5 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Heading level={2} className="text-xl font-semibold text-zinc-900 mb-2">
                  Preview Bulletin
                </Heading>
                <Text className="text-zinc-600">
                  Review your bulletin before creating it.
                </Text>
              </div>
            </div>

            <BulletinPreview
              title={selectedSchedule?.title || `${selectedSchedule?.scheduleType} Bulletin`}
              intro={watchedIntro}
              outro={watchedOutro}
              language={selectedSchedule?.language || 'ENGLISH'}
              stories={selectedStories}
              scheduledFor={(() => {
                if (watchedScheduledDate && selectedSchedule?.time) {
                  const [hours, minutes] = selectedSchedule.time.split(':');
                  const dateTime = new Date(watchedScheduledDate);
                  dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                  return dateTime.toISOString();
                }
                return undefined;
              })()}
              scheduleTitle={selectedSchedule?.title}
              scheduleTime={selectedSchedule?.time}
            />

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                outline
                onClick={goToPreviousStep}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-kelly-green hover:bg-kelly-green/90 text-white"
              >
                {isSubmitting ? 'Creating...' : 'Create Bulletin'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {errors.root && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <Text className="text-red-600">{errors.root.message}</Text>
        </Card>
      )}
    </form>
  );
}
