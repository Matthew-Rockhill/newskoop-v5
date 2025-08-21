'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { XMarkIcon } from '@heroicons/react/24/outline';

const scheduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  time: z.string().min(1, 'Time is required'),
  language: z.enum(['ENGLISH', 'AFRIKAANS', 'XHOSA']),
  scheduleType: z.enum(['WEEKDAY', 'WEEKEND', 'PUBLIC_HOLIDAY']),
  isActive: z.boolean(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface BulletinSchedule {
  id: string;
  title: string;
  time: string;
  language: 'ENGLISH' | 'AFRIKAANS' | 'XHOSA';
  scheduleType: 'WEEKDAY' | 'WEEKEND' | 'PUBLIC_HOLIDAY';
  isActive: boolean;
}

interface BulletinScheduleManagerProps {
  schedule?: BulletinSchedule | null;
  defaultType?: 'WEEKDAY' | 'WEEKEND' | 'PUBLIC_HOLIDAY';
  onClose: () => void;
  onSuccess: () => void;
}

export function BulletinScheduleManager({
  schedule,
  defaultType = 'WEEKDAY',
  onClose,
  onSuccess,
}: BulletinScheduleManagerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: schedule ? {
      title: schedule.title,
      time: schedule.time,
      language: schedule.language,
      scheduleType: schedule.scheduleType,
      isActive: schedule.isActive,
    } : {
      title: '',
      time: '',
      language: 'ENGLISH',
      scheduleType: defaultType,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const response = await fetch('/api/newsroom/bulletins/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create schedule');
      }
      return result;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const response = await fetch(`/api/newsroom/bulletins/schedules/${schedule!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update schedule');
      return result;
    },
  });

  const onSubmit = async (data: ScheduleFormData) => {
    try {
      setIsSubmitting(true);
      if (schedule) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Failed to save schedule',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {schedule ? 'Edit Schedule' : 'Create Bulletin Schedule'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Title *
              </label>
              <Input
                {...register('title')}
                placeholder="e.g., Morning News Bulletin"
                data-invalid={!!errors.title}
              />
              {errors.title && (
                <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time *
              </label>
              <Select 
                {...register('time')} 
                data-invalid={!!errors.time}
              >
                <option value="">Select time...</option>
                <option value="04:00">4:00 AM</option>
                <option value="04:30">4:30 AM</option>
                <option value="05:00">5:00 AM</option>
                <option value="05:30">5:30 AM</option>
                <option value="06:00">6:00 AM</option>
                <option value="06:30">6:30 AM</option>
                <option value="07:00">7:00 AM</option>
                <option value="07:30">7:30 AM</option>
                <option value="08:00">8:00 AM</option>
                <option value="08:30">8:30 AM</option>
                <option value="09:00">9:00 AM</option>
                <option value="09:30">9:30 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="10:30">10:30 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="11:30">11:30 AM</option>
                <option value="12:00">12:00 PM</option>
                <option value="12:30">12:30 PM</option>
                <option value="13:00">1:00 PM</option>
                <option value="13:30">1:30 PM</option>
                <option value="14:00">2:00 PM</option>
                <option value="14:30">2:30 PM</option>
                <option value="15:00">3:00 PM</option>
                <option value="15:30">3:30 PM</option>
                <option value="16:00">4:00 PM</option>
                <option value="16:30">4:30 PM</option>
                <option value="17:00">5:00 PM</option>
                <option value="17:30">5:30 PM</option>
                <option value="18:00">6:00 PM</option>
                <option value="18:30">6:30 PM</option>
                <option value="19:00">7:00 PM</option>
              </Select>
              {errors.time && (
                <p className="text-red-600 text-sm mt-1">{errors.time.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Business hours: 4:00 AM - 7:00 PM (30-minute intervals)
              </p>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language *
              </label>
              <Select 
                {...register('language')} 
                data-invalid={!!errors.language}
              >
                <option value="ENGLISH">English</option>
                <option value="AFRIKAANS">Afrikaans</option>
                <option value="XHOSA">Xhosa</option>
              </Select>
              {errors.language && (
                <p className="text-red-600 text-sm mt-1">{errors.language.message}</p>
              )}
            </div>

            {/* Schedule Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Type *
              </label>
              <Select 
                {...register('scheduleType')} 
                data-invalid={!!errors.scheduleType}
              >
                <option value="WEEKDAY">Weekday</option>
                <option value="WEEKEND">Weekend</option>
                <option value="PUBLIC_HOLIDAY">Public Holiday</option>
              </Select>
              {errors.scheduleType && (
                <p className="text-red-600 text-sm mt-1">{errors.scheduleType.message}</p>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('isActive')}
                className="h-4 w-4 text-[#76BD43] focus:ring-[#76BD43] border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Schedule is active
              </label>
            </div>

            {/* Error Message */}
            {errors.root && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                outline
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (schedule ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}