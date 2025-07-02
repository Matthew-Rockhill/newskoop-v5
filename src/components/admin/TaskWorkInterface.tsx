'use client';

import { useTask } from '@/hooks/use-tasks';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { StoryWorkInterface } from './StoryWorkInterface';
import { BulletinWorkInterface } from './BulletinWorkInterface';
import { ShowWorkInterface } from './ShowWorkInterface';

interface TaskWorkInterfaceProps {
  taskId: string;
}

export function TaskWorkInterface({ taskId }: TaskWorkInterfaceProps) {
  const { data: task, isLoading, error } = useTask(taskId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <Card className="p-6 text-center">
        <Heading level={3} className="text-red-600 mb-2">Task Not Found</Heading>
        <Text className="text-gray-600">
          The task you're trying to work on could not be found or you don't have permission to access it.
        </Text>
      </Card>
    );
  }

  // Route to appropriate work interface based on task type
  const getWorkInterface = () => {
    const storyTasks = [
      'STORY_CREATE', 
      'STORY_REVIEW', 
      'STORY_REVISION_TO_AUTHOR', 
      'STORY_APPROVAL', 
      'STORY_REVISION_TO_JOURNALIST',
      'STORY_TRANSLATE',
      'STORY_TRANSLATION_REVIEW',
      'STORY_PUBLISH',
      'STORY_FOLLOW_UP'
    ];

    const bulletinTasks = [
      'BULLETIN_CREATE',
      'BULLETIN_REVIEW', 
      'BULLETIN_PUBLISH'
    ];

    const showTasks = [
      'SHOW_CREATE',
      'SHOW_REVIEW',
      'SHOW_PUBLISH'
    ];

    if (storyTasks.includes(task.type)) {
      return <StoryWorkInterface task={task} />;
    }
    
    if (bulletinTasks.includes(task.type)) {
      return <BulletinWorkInterface task={task} />;
    }
    
    if (showTasks.includes(task.type)) {
      return <ShowWorkInterface task={task} />;
    }

    // Fallback for unrecognized task types
    return (
      <Card className="p-6">
        <Heading level={3} className="mb-4">
          {task.title}
          <Badge color="blue" className="ml-2">{task.type.replace('_', ' ')}</Badge>
        </Heading>
        <Text className="text-gray-600 mb-4">{task.description}</Text>
        <Text className="text-sm text-yellow-600">
          This task type doesn't have a specialized work interface yet. 
          Please use the task detail page to manage this task.
        </Text>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Task Context Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heading level={4}>{task.title}</Heading>
              <Badge color="blue">{task.type.replace('_', ' ')}</Badge>
              <Badge color={task.priority === 'URGENT' ? 'red' : task.priority === 'HIGH' ? 'orange' : 'gray'}>
                {task.priority}
              </Badge>
            </div>
            <Text className="text-gray-600 text-sm">{task.description}</Text>
          </div>
          {task.dueDate && (
            <div className="text-right">
              <Text className="text-sm text-gray-500">Due Date</Text>
              <Text className="text-sm font-medium">
                {new Date(task.dueDate).toLocaleDateString()}
              </Text>
            </div>
          )}
        </div>
      </Card>

      {/* Work Interface */}
      {getWorkInterface()}
    </div>
  );
} 