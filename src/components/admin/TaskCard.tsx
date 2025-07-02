'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/ui/dropdown';

import type { Task, TaskType } from '@/types';

// Task status badge colors
const statusColors = {
  PENDING: 'amber',
  IN_PROGRESS: 'blue',
  COMPLETED: 'emerald',
  CANCELLED: 'gray',
  BLOCKED: 'red',
  PENDING_ASSIGNMENT: 'orange',
} as const;

// Task priority badge colors
const priorityColors = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
} as const;

// Task type display names
const taskTypeNames = {
  STORY_CREATE: 'Write Story',
  STORY_REVIEW: 'Review Story',
  STORY_REVISION_TO_AUTHOR: 'Revise Story',
  STORY_APPROVAL: 'Approve Story',
  STORY_REVISION_TO_JOURNALIST: 'Revision Request',
  STORY_TRANSLATE: 'Translate Story',
  STORY_TRANSLATION_REVIEW: 'Review Translation',
  STORY_PUBLISH: 'Publish Story',
  STORY_FOLLOW_UP: 'Follow-up Story',
  BULLETIN_CREATE: 'Create Bulletin',
  BULLETIN_REVIEW: 'Review Bulletin',
  BULLETIN_PUBLISH: 'Publish Bulletin',
  SHOW_CREATE: 'Create Show',
  SHOW_REVIEW: 'Review Show',
  SHOW_PUBLISH: 'Publish Show',
} as const;

interface TaskCardProps {
  task: Task;
  showAssignee?: boolean;
  showActions?: boolean;
  onComplete?: (taskId: string) => void;
  onAssign?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  className?: string;
}

export function TaskCard({
  task,
  showAssignee = true,
  showActions = false,
  onComplete,
  onAssign,
  onEdit,
  className = '',
}: TaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const getTaskIcon = (type: TaskType) => {
    if (type.includes('REVIEW') || type.includes('APPROVAL')) {
      return CheckCircleIcon;
    }
    if (type.includes('REVISION')) {
      return ExclamationTriangleIcon;
    }
    return DocumentTextIcon;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDueDate = (dueDateString?: string) => {
    if (!dueDateString) return null;
    
    const dueDate = new Date(dueDateString);
    const now = new Date();
    const diffInHours = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 0) return { text: 'Overdue', color: 'red' };
    if (diffInHours < 24) return { text: `Due in ${diffInHours}h`, color: 'orange' };
    if (diffInHours < 48) return { text: 'Due tomorrow', color: 'amber' };
    return { 
      text: `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 
      color: 'gray' 
    };
  };

  const handleComplete = async () => {
    if (!onComplete || isCompleting) return;
    
    setIsCompleting(true);
    try {
      await onComplete(task.id);
    } finally {
      setIsCompleting(false);
    }
  };

  const TaskIcon = getTaskIcon(task.type);
  const dueInfo = formatDueDate(task.dueDate);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <TaskIcon className="h-6 w-6 text-gray-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/admin/newsroom/tasks/${task.id}`}
                  className="block hover:text-blue-600 transition-colors"
                >
                  <h3 className="font-medium text-gray-900 truncate">
                    {task.title}
                  </h3>
                </Link>
                <p className="text-sm text-gray-500 truncate mt-1">
                  {taskTypeNames[task.type]}
                </p>
                
                {task.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                {task.story && (
                  <div className="mt-2">
                    <Link 
                      href={`/admin/newsroom/stories/${task.story.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Story: {task.story.title}
                    </Link>
                  </div>
                )}
              </div>
              
              {showActions && (
                <Dropdown>
                  <DropdownButton className="ml-2 p-1 text-gray-400 hover:text-gray-600">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </DropdownButton>
                  <DropdownMenu>
                    {task.status !== 'COMPLETED' && onComplete && (
                      <DropdownItem onClick={handleComplete} disabled={isCompleting}>
                        {isCompleting ? 'Completing...' : 'Mark Complete'}
                      </DropdownItem>
                    )}
                    {onAssign && (
                      <DropdownItem onClick={() => onAssign(task.id)}>
                        Reassign
                      </DropdownItem>
                    )}
                    {onEdit && (
                      <DropdownItem onClick={() => onEdit(task.id)}>
                        Edit
                      </DropdownItem>
                    )}
                  </DropdownMenu>
                </Dropdown>
              )}
            </div>
            
            {/* Metadata row */}
            <div className="flex items-center gap-4 mt-3">
              {showAssignee && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Avatar
                    className="h-4 w-4"
                    name={`${task.assignedTo.firstName} ${task.assignedTo.lastName}`}
                  />
                  <span>{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <ClockIcon className="h-3 w-3" />
                {formatRelativeTime(task.createdAt)}
              </div>
            </div>
            
            {/* Badges row */}
            <div className="flex items-center gap-2 mt-3">
              <Badge
                color={priorityColors[task.priority]}
                size="sm"
              >
                {task.priority}
              </Badge>
              
              <Badge
                color={statusColors[task.status]}
                size="sm"
              >
                {task.status.replace('_', ' ')}
              </Badge>
              
              {dueInfo && (
                <Badge
                  color={dueInfo.color as any}
                  size="sm"
                >
                  {dueInfo.text}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCard; 