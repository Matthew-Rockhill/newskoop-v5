'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  UserIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fieldset, Field, Label } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';

import { useTasks } from '@/hooks/use-tasks';
import { useUsers } from '@/hooks/use-users';
import { useStories } from '@/hooks/use-stories';
import { TaskType, TaskPriority } from '@prisma/client';
import { useSession } from 'next-auth/react';

// Task assignment schema
const taskAssignmentSchema = z.object({
  type: z.nativeEnum(TaskType),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority),
  assignedToId: z.string().min(1, 'Assignee is required'),
  contentId: z.string().optional(),
  dueDate: z.string().optional(),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().optional(),
});

type TaskAssignmentFormData = z.infer<typeof taskAssignmentSchema>;

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedStoryId?: string;
  preselectedType?: TaskType;
}

// Manual task types (only manually initiated tasks)
const manualTaskTypes = [
  { value: 'STORY_CREATE', label: 'Write Story', icon: DocumentTextIcon },
  { value: 'STORY_FOLLOW_UP', label: 'Follow-up Story', icon: DocumentTextIcon },
] as const;

const priorityOptions = [
  { value: 'LOW', label: 'Low', color: 'zinc' },
  { value: 'MEDIUM', label: 'Medium', color: 'blue' },
  { value: 'HIGH', label: 'High', color: 'orange' },
  { value: 'URGENT', label: 'Urgent', color: 'red' },
] as const;

const languageOptions = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'AFRIKAANS', label: 'Afrikaans' },
  { value: 'XHOSA', label: 'Xhosa' },
];

export function TaskAssignmentModal({ 
  isOpen, 
  onClose, 
  preselectedStoryId,
  preselectedType 
}: TaskAssignmentModalProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data for dropdowns
  const { users } = useUsers({ isActive: true, userType: 'STAFF' });
  const { stories } = useStories({ status: undefined, page: 1, perPage: 100 });
  const { createTask } = useTasks();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskAssignmentFormData>({
    resolver: zodResolver(taskAssignmentSchema),
    defaultValues: {
      priority: 'MEDIUM',
      contentId: preselectedStoryId || '',
      type: preselectedType || undefined,
    },
  });

  const selectedType = watch('type');
  const selectedPriority = watch('priority');
  const selectedAssigneeId = watch('assignedToId');
  const isTranslationTask = selectedType?.includes('TRANSLATE');

  // Role-based filtering for task types
  const getAvailableTaskTypes = () => {
    const userRole = session?.user?.staffRole;
    if (!userRole) return manualTaskTypes;

    // All roles can assign creation and follow-up tasks
    // Role hierarchy will be enforced when the tasks are processed
    return manualTaskTypes;
  };

  // Filter users based on task type
  const getEligibleUsers = () => {
    if (!selectedType || !users) return users;

    return users.filter(user => {
      const role = user.staffRole;
      
      // For creation tasks, all staff roles can be assigned
      // For follow-up tasks, typically journalists and above
      if (selectedType === 'STORY_FOLLOW_UP') {
        return ['JOURNALIST', 'SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(role);
      }
      
      // All roles can be assigned creation tasks
      return ['INTERN', 'JOURNALIST', 'SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(role);
    });
  };

  const selectedUser = users?.find(u => u.id === selectedAssigneeId);
  const selectedPriorityOption = priorityOptions.find(p => p.value === selectedPriority);

  const onSubmit = async (data: TaskAssignmentFormData) => {
    setIsSubmitting(true);
    try {
      await createTask({
        ...data,
        contentType: 'story', // Default to story
      });
      
      toast.success('Task assigned successfully');
      reset();
      onClose();
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error('Failed to assign task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-generate title based on type and story selection
  const handleTypeChange = (type: TaskType) => {
    setValue('type', type);
    
    const selectedStory = stories?.find(s => s.id === watch('contentId'));
    const typeLabel = manualTaskTypes.find(opt => opt.value === type)?.label || type;
    
    if (selectedStory) {
      setValue('title', `${typeLabel}: ${selectedStory.title}`);
    } else {
      setValue('title', typeLabel);
    }
  };

  const handleStoryChange = (storyId: string) => {
    setValue('contentId', storyId);
    
    if (selectedType && storyId) {
      const selectedStory = stories?.find(s => s.id === storyId);
      const typeLabel = manualTaskTypes.find(opt => opt.value === selectedType)?.label || selectedType;
      
      if (selectedStory) {
        setValue('title', `${typeLabel}: ${selectedStory.title}`);
      }
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>Assign New Task</DialogTitle>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogBody className="space-y-6">
          {/* Task Type */}
          <Fieldset>
            <Field>
              <Label htmlFor="type">Task Type</Label>
              <Select
                {...register('type')}
                onChange={(e) => handleTypeChange(e.target.value as TaskType)}
              >
                <option value="">Select task type...</option>
                {getAvailableTaskTypes().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
              )}
            </Field>
          </Fieldset>

          {/* Title */}
          <Fieldset>
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
          </Fieldset>

          {/* Priority & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="priority">Priority</Label>
              <Select {...register('priority')}>
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {selectedPriorityOption && (
                <div className="mt-2">
                  <Badge color={selectedPriorityOption.color as any} className="text-xs">
                    {selectedPriorityOption.label} Priority
                  </Badge>
                </div>
              )}
            </Field>

            <Field>
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                {...register('dueDate')}
                type="datetime-local"
              />
            </Field>
          </div>

          {/* Assignee */}
          <Fieldset>
            <Field>
              <Label htmlFor="assignedToId">Assign To</Label>
              <Select {...register('assignedToId')}>
                <option value="">Select assignee...</option>
                {getEligibleUsers()?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.staffRole})
                  </option>
                ))}
              </Select>
              {errors.assignedToId && (
                <p className="text-sm text-red-600 mt-1">{errors.assignedToId.message}</p>
              )}
              
              {/* User Preview */}
              {selectedUser && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={selectedUser.profileImage || undefined}
                      alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                      className="h-8 w-8"
                    />
                    <div>
                      <div className="font-medium text-sm">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color="blue" className="text-xs">
                          {selectedUser.staffRole}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {selectedUser.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Field>
          </Fieldset>

          {/* Related Story */}
          <Fieldset>
            <Field>
              <Label htmlFor="contentId">Related Story (Optional)</Label>
              <Select 
                {...register('contentId')}
                onChange={(e) => handleStoryChange(e.target.value)}
              >
                <option value="">No related story</option>
                {stories?.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title} - {story.status}
                  </option>
                ))}
              </Select>
            </Field>
          </Fieldset>

          {/* Translation Details */}
          {isTranslationTask && (
            <Fieldset>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <Label htmlFor="sourceLanguage">Source Language</Label>
                  <Select {...register('sourceLanguage')}>
                    <option value="">Select source language...</option>
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field>
                  <Label htmlFor="targetLanguage">Target Language</Label>
                  <Select {...register('targetLanguage')}>
                    <option value="">Select target language...</option>
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Fieldset>
          )}

          {/* Description */}
          <Fieldset>
            <Field>
              <Label htmlFor="description">Additional Notes (Optional)</Label>
              <Textarea
                {...register('description')}
                rows={3}
                placeholder="Add any additional instructions or context..."
              />
            </Field>
          </Fieldset>
        </DialogBody>

        <DialogActions>
          <Button
            type="button"
            color="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Task'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default TaskAssignmentModal; 