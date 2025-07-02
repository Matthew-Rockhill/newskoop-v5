'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Fieldset } from '@/components/ui/fieldset';
import { FileUpload } from '@/components/ui/file-upload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Select } from '@/components/ui/select';
import { 
  DocumentTextIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  UserIcon,
  TagIcon
} from '@heroicons/react/24/outline';

import { useCreateStory, useUpdateStory } from '@/hooks/use-stories';
import { useCategories } from '@/hooks/use-categories';
import { useTags } from '@/hooks/use-tags';
import { useUsers } from '@/hooks/use-users';
import type { Task } from '@/types';

interface StoryWorkInterfaceProps {
  task: Task;
}

export function StoryWorkInterface({ task }: StoryWorkInterfaceProps) {
  const router = useRouter();
  const createStoryMutation = useCreateStory();
  const updateStoryMutation = useUpdateStory();
  const { data: categoriesData } = useCategories();
  const { data: tagsData } = useTags();
  const { data: usersData } = useUsers({ userType: 'STAFF', isActive: true });
  
  const categories = categoriesData?.categories || [];
  const tags = tagsData?.tags || [];
  const users = usersData?.users || [];

  // Story form state
  const [storyData, setStoryData] = useState({
    title: task.story?.title || '',
    content: '',
    summary: '',
    categoryId: '',
    tagIds: [] as string[],
    priority: 'MEDIUM' as const,
  });

  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [selectedApprover, setSelectedApprover] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing story data if editing
  useEffect(() => {
    if (task.story) {
      setStoryData(prev => ({
        ...prev,
        title: task.story.title,
        // We would load other fields here from API
      }));
    }
  }, [task.story]);

  const getStageInfo = (taskType: string) => {
    switch (taskType) {
      case 'STORY_CREATE':
        return {
          icon: DocumentTextIcon,
          title: 'Write Story',
          description: 'Create a new story with title, content, and summary.',
          color: 'blue'
        };
      case 'STORY_REVIEW':
        return {
          icon: ExclamationCircleIcon,
          title: 'Review Story',
          description: 'Review content, fact-check, and either approve or request revisions.',
          color: 'orange'
        };
      case 'STORY_APPROVAL':
        return {
          icon: TagIcon,
          title: 'Categorize & Approve',
          description: 'Assign category and tags, then approve for publishing.',
          color: 'green'
        };
      case 'STORY_TRANSLATE':
        return {
          icon: DocumentTextIcon,
          title: 'Translate Story',
          description: 'Translate the story to required language.',
          color: 'purple'
        };
      case 'STORY_PUBLISH':
        return {
          icon: CheckCircleIcon,
          title: 'Publish Story',
          description: 'Final checks and publish the story.',
          color: 'green'
        };
      default:
        return {
          icon: ClockIcon,
          title: 'Story Task',
          description: 'Complete the assigned work.',
          color: 'gray'
        };
    }
  };

  const canShowCategoryTags = () => {
    return ['STORY_APPROVAL', 'STORY_PUBLISH'].includes(task.type);
  };

  const needsReviewerSelection = () => {
    return task.type === 'STORY_CREATE' && task.assignedTo?.staffRole === 'INTERN';
  };

  const needsApproverSelection = () => {
    return (task.type === 'STORY_CREATE' && task.assignedTo?.staffRole === 'JOURNALIST') ||
           task.type === 'STORY_REVIEW';
  };

  const getAvailableUsers = (role: string) => {
    switch (role) {
      case 'reviewer':
        return users.filter(user => user.staffRole === 'JOURNALIST');
      case 'approver':
        return users.filter(user => ['SUB_EDITOR', 'EDITOR'].includes(user.staffRole || ''));
      default:
        return users;
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!storyData.title.trim()) {
      newErrors.title = 'Story title is required';
    }
    if (!storyData.content.trim()) {
      newErrors.content = 'Story content is required';
    }

    // Category is only required to be manually selected in approval+ stages
    // For creation, we'll use a default category
    if (canShowCategoryTags() && !storyData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (needsReviewerSelection() && !selectedReviewer) {
      newErrors.reviewer = 'Please select a reviewer';
    }

    if (needsApproverSelection() && !selectedApprover) {
      newErrors.approver = 'Please select an approver';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStageAction = async (action: string) => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Update story first
      const storyPayload = {
        ...storyData,
        // Ensure we always have a category - use default if not selected
        categoryId: storyData.categoryId || (categories.find(c => c.slug === 'local-news')?.id || categories[0]?.id || ''),
      };

      // Validate that we have a category
      if (!storyPayload.categoryId) {
        setErrors({ submit: 'No categories available. Please contact an administrator.' });
        return;
      }

      if (task.story?.id) {
        await updateStoryMutation.mutateAsync({
          id: task.story.id,
          data: storyPayload,
        });
      } else {
        var newStory = await createStoryMutation.mutateAsync(storyPayload);
        // Would update task with story ID here
      }

      // Handle task completion and progression
      if (action === 'submit_for_review' || action === 'submit_for_approval' || action === 'save_draft') {
        // Mark current task as completed
        await fetch(`/api/tasks/${task.id}/complete`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              action,
              reviewer: selectedReviewer,
              approver: selectedApprover,
              revisionNotes,
              storyId: task.story?.id || newStory?.id,
            }
          }),
        });

        // Create next task if needed
        if (action === 'submit_for_review') {
          const nextAssignee = selectedReviewer || selectedApprover;
          if (nextAssignee) {
            await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'STORY_REVIEW',
                title: `Review: ${storyData.title}`,
                description: `Review the story "${storyData.title}" for accuracy and quality.`,
                priority: 'HIGH',
                assignedToId: nextAssignee,
                contentType: 'story',
                contentId: task.story?.id || newStory?.id,
              }),
            });
          }
        }
      }

      // Navigate back to tasks
      router.push('/admin/newsroom/tasks');

    } catch (error) {
      console.error('Failed to process stage action:', error);
      setErrors({ submit: 'Failed to process action. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stageInfo = getStageInfo(task.type);

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${
            stageInfo.color === 'blue' ? 'bg-blue-100 text-blue-600' :
            stageInfo.color === 'orange' ? 'bg-orange-100 text-orange-600' :
            stageInfo.color === 'green' ? 'bg-green-100 text-green-600' :
            stageInfo.color === 'purple' ? 'bg-purple-100 text-purple-600' :
            stageInfo.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            <stageInfo.icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <Heading level={3} className="mb-2">{stageInfo.title}</Heading>
            <Text className="text-gray-600">{stageInfo.description}</Text>
            <Badge color="blue" className="mt-2">
              Task: {task.type.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Story Form */}
      <Card className="p-6">
        <form className="space-y-6">
          {/* Title */}
          <Fieldset>
            <Input
              label="Story Title"
              value={storyData.title}
              onChange={(e) => setStoryData(prev => ({ ...prev, title: e.target.value }))}
              error={errors.title}
              placeholder="Enter story title..."
            />
          </Fieldset>

          {/* Summary */}
          <Fieldset>
            <Textarea
              label="Story Summary"
              value={storyData.summary}
              onChange={(e) => setStoryData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Brief summary of the story..."
              rows={3}
            />
          </Fieldset>

          {/* Content */}
          <Fieldset>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Story Content
            </label>
            <RichTextEditor
              value={storyData.content}
              onChange={(content) => setStoryData(prev => ({ ...prev, content }))}
              placeholder="Write your story here..."
              className="min-h-[400px]"
            />
            {errors.content && (
              <Text className="text-red-600 text-sm mt-1">{errors.content}</Text>
            )}
          </Fieldset>

          {/* Audio Upload */}
          <Fieldset>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Audio Files (Optional)
            </label>
            <FileUpload
              onFilesChange={setAudioFiles}
              maxFiles={5}
              maxFileSize={50}
            />
          </Fieldset>

          {/* Category & Tags (only in approval+ stages) */}
          {canShowCategoryTags() && (
            <>
              <Fieldset>
                <Select
                  label="Category"
                  value={storyData.categoryId}
                  onChange={(value) => setStoryData(prev => ({ ...prev, categoryId: value }))}
                  error={errors.categoryId}
                >
                  <option value="">Select category...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Fieldset>

              <Fieldset>
                <div>
                  <label className="block text-sm/6 font-medium leading-6 text-gray-900 mb-2">
                    Tags (Optional)
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3 bg-white">
                    {tags.length ? (
                      tags.map((tag) => (
                        <label key={tag.id} className="flex items-center">
                          <input
                            type="checkbox"
                            value={tag.id}
                            checked={storyData.tagIds.includes(tag.id)}
                            onChange={(e) => {
                              const tagId = e.target.value;
                              setStoryData(prev => ({
                                ...prev,
                                tagIds: e.target.checked
                                  ? [...prev.tagIds, tagId]
                                  : prev.tagIds.filter(id => id !== tagId)
                              }));
                            }}
                            className="h-4 w-4 text-[#76BD43] focus:ring-[#76BD43] border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{tag.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No tags available</p>
                    )}
                  </div>
                </div>
              </Fieldset>
            </>
          )}

          {/* Reviewer Selection */}
          {needsReviewerSelection() && (
            <Fieldset>
              <Select
                label="Select Reviewer"
                value={selectedReviewer}
                onChange={setSelectedReviewer}
                error={errors.reviewer}
              >
                <option value="">Select a journalist reviewer...</option>
                {getAvailableUsers('reviewer').map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.staffRole})
                  </option>
                ))}
              </Select>
            </Fieldset>
          )}

          {/* Approver Selection */}
          {needsApproverSelection() && (
            <Fieldset>
              <Select
                label="Select Approver"
                value={selectedApprover}
                onChange={setSelectedApprover}
                error={errors.approver}
              >
                <option value="">Select a sub-editor...</option>
                {getAvailableUsers('approver').map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.staffRole})
                  </option>
                ))}
              </Select>
            </Fieldset>
          )}

          {/* Revision Notes (for review stage) */}
          {task.type === 'STORY_REVIEW' && (
            <Fieldset>
              <Textarea
                label="Revision Notes (Optional)"
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Add notes if sending for revision..."
                rows={3}
              />
            </Fieldset>
          )}

          {/* Error Display */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-600">{errors.submit}</Text>
            </div>
          )}

          {/* Stage Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              type="button"
              color="white"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            
            <div className="flex gap-3">
              {/* Task-specific action buttons */}
              {task.type === 'STORY_CREATE' && (
                <Button
                  type="button"
                  onClick={() => handleStageAction('submit_for_review')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Complete Story & Submit for Review'}
                </Button>
              )}

              {task.type === 'STORY_REVIEW' && (
                <>
                  <Button
                    type="button"
                    color="white"
                    onClick={() => handleStageAction('send_for_revision')}
                    disabled={isSubmitting}
                  >
                    Send for Revision
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleStageAction('submit_for_approval')}
                    disabled={isSubmitting}
                  >
                    Approve & Submit for Publishing
                  </Button>
                </>
              )}

              {/* Save Draft always available */}
              <Button
                type="button"
                color="white"
                onClick={() => handleStageAction('save_draft')}
                disabled={isSubmitting}
              >
                Save Draft
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
} 