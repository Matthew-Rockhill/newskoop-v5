'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fieldset, Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { useTasks } from '@/hooks/use-tasks';
import type { Task } from '@/types';
import { TaskPriority, TaskStatus } from '@prisma/client';

const taskEditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus),
  dueDate: z.string().optional(),
});

type TaskEditFormData = z.infer<typeof taskEditSchema>;

interface TaskEditModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const priorityOptions = [
  { value: 'LOW', label: 'Low', color: 'zinc' },
  { value: 'MEDIUM', label: 'Medium', color: 'blue' },
  { value: 'HIGH', label: 'High', color: 'orange' },
  { value: 'URGENT', label: 'Urgent', color: 'red' },
];

const statusOptions = [
  { value: 'PENDING', label: 'Pending', color: 'amber' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'blue' },
  { value: 'COMPLETED', label: 'Completed', color: 'emerald' },
  { value: 'BLOCKED', label: 'Blocked', color: 'red' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'zinc' },
  { value: 'PENDING_ASSIGNMENT', label: 'Pending Assignment', color: 'orange' },
];

export function TaskEditModal({
  task,
  isOpen,
  onClose,
  onSuccess,
}: TaskEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateTask } = useTasks();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TaskEditFormData>({
    resolver: zodResolver(taskEditSchema),
  });

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate 
          ? new Date(task.dueDate).toISOString().slice(0, 16)
          : '',
      });
    }
  }, [task, reset]);

  const watchedPriority = watch('priority');
  const watchedStatus = watch('status');

  const onSubmit = async (data: TaskEditFormData) => {
    if (!task) return;

    setIsSubmitting(true);
    try {
      await updateTask({
        id: task.id,
        data: {
          title: data.title,
          description: data.description || undefined,
          priority: data.priority,
          status: data.status,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        },
      });

      toast.success('Task updated successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!task) return null;

  const selectedPriority = priorityOptions.find(opt => opt.value === watchedPriority);
  const selectedStatus = statusOptions.find(opt => opt.value === watchedStatus);

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <DialogTitle>Edit Task</DialogTitle>
      
      <DialogBody>
          {/* Task Type Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Task Type</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {task.type.replace(/_/g, ' ').toLowerCase()}
                </p>
              </div>
              <Badge color="zinc">
                {task.type}
              </Badge>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Fieldset>
              {/* Title */}
              <Field>
                <Label htmlFor="title">Title</Label>
                <Input
                  {...register('title')}
                  placeholder="Enter task title..."
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                )}
              </Field>

              {/* Description */}
              <Field>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  {...register('description')}
                  rows={4}
                  placeholder="Enter task description..."
                />
              </Field>

              {/* Priority */}
              <Field>
                <Label htmlFor="priority">Priority</Label>
                <div className="space-y-2">
                  <Select {...register('priority')}>
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {selectedPriority && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Preview:</span>
                      <Badge color={selectedPriority.color as any}>
                        {selectedPriority.label}
                      </Badge>
                    </div>
                  )}
                </div>
              </Field>

              {/* Status */}
              <Field>
                <Label htmlFor="status">Status</Label>
                <div className="space-y-2">
                  <Select {...register('status')}>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {selectedStatus && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Preview:</span>
                      <Badge color={selectedStatus.color as any}>
                        {selectedStatus.label}
                      </Badge>
                    </div>
                  )}
                </div>
              </Field>

              {/* Due Date */}
              <Field>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  {...register('dueDate')}
                  type="datetime-local"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty to remove due date
                </p>
              </Field>
            </Fieldset>

            {/* Assignment Info (Read-only) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Assignment</h4>
              <div className="text-sm text-blue-800">
                <p>Assigned to: {task.assignedTo.firstName} {task.assignedTo.lastName}</p>
                <p>Created by: {task.createdBy.firstName} {task.createdBy.lastName}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Use the "Reassign" button to change assignment
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <DialogActions>
              <Button
                type="button"
                color="secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isDirty}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogActions>
          </form>
      </DialogBody>
    </Dialog>
  );
}

export default TaskEditModal; 