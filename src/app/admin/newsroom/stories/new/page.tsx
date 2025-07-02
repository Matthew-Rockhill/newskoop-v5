'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Field, FieldGroup, Fieldset, Label, ErrorMessage } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { 
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

export default function NewStoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  
  // Task form state
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as const,
    dueDate: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!session?.user) {
      router.push('/login');
    }
  }, [session, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!taskData.title.trim()) {
      newErrors.title = 'Story title is required';
    }
    if (!taskData.description.trim()) {
      newErrors.description = 'Story description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateStoryTask = async () => {
    if (!validateForm() || !session?.user?.id) return;

    setIsCreating(true);
    try {
      // Create a STORY_CREATE task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'STORY_CREATE',
          title: `Write Story: ${taskData.title}`,
          description: taskData.description,
          priority: taskData.priority,
          assignedToId: session.user.id,
          contentType: 'story', // Required field
          ...(taskData.dueDate && { dueDate: taskData.dueDate }),
          metadata: {
            storyTitle: taskData.title,
            storyDescription: taskData.description,
          },
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create story task';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError);
        throw new Error('Task created but failed to get response data');
      }

      toast.success('Story task created! Redirecting to work interface...');
      
      // Redirect to the work interface
      router.push(`/admin/newsroom/tasks/${result.id}/work`);
    } catch (error) {
      console.error('Failed to create story task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create story task');
    } finally {
      setIsCreating(false);
    }
  };

  if (!session?.user) {
    return null; // Will redirect
  }

  return (
    <Container>
      <PageHeader
        title="Create New Story"
        description="Start a new story through the editorial workflow"
      />

      <div className="space-y-6">
        {/* Workflow Explanation */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <DocumentTextIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <Heading level={3} className="text-blue-900 mb-2">Task-Based Story Creation</Heading>
              <Text className="text-blue-800 mb-4">
                All stories are now created through our editorial workflow to ensure quality and consistency. 
                This creates a writing task that you can work on immediately.
              </Text>
              
              <div className="flex flex-wrap gap-2">
                <Badge color="blue">1. Write Story</Badge>
                <Badge color="orange">2. Review & Edit</Badge>
                <Badge color="green">3. Approve</Badge>
                <Badge color="purple">4. Translate</Badge>
                <Badge color="emerald">5. Publish</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Task Creation Form */}
        <Card className="p-6">
          <Heading level={2} className="mb-6">Story Details</Heading>
          
          <Fieldset>
            <FieldGroup className="space-y-6">
              <Field>
                <Label htmlFor="title">Story Title *</Label>
                <Input
                  id="title"
                  value={taskData.title}
                  onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter the story title..."
                />
                {errors.title && (
                  <ErrorMessage>{errors.title}</ErrorMessage>
                )}
              </Field>

              <Field>
                <Label htmlFor="description">Story Brief/Description *</Label>
                <Textarea
                  id="description"
                  value={taskData.description}
                  onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide a brief description of what this story will cover..."
                  rows={4}
                />
                {errors.description && (
                  <ErrorMessage>{errors.description}</ErrorMessage>
                )}
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    id="priority"
                    value={taskData.priority}
                    onChange={(e) => setTaskData(prev => ({ ...prev, priority: e.target.value as any }))}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </Select>
                </Field>

                <Field>
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={taskData.dueDate}
                    onChange={(e) => setTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </Field>
              </div>
            </FieldGroup>
          </Fieldset>
        </Card>

        {/* Assignment Info */}
        <Card className="p-6 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full bg-gray-200">
              <UserIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <Text className="font-medium">Assigned to you</Text>
              <Text className="text-sm text-gray-600">
                {session.user.firstName} {session.user.lastName} ({session.user.staffRole})
              </Text>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <Text className="text-sm text-gray-600">Will start immediately</Text>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            color="white"
            onClick={() => router.push('/admin/newsroom/stories')}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleCreateStoryTask}
            disabled={isCreating}
          >
            {isCreating ? 'Creating Task...' : 'Create Story Task & Start Writing'}
          </Button>
        </div>
      </div>
    </Container>
  );
}