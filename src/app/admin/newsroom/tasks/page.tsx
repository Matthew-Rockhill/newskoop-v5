'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';

import { useTasks, type TaskFilters } from '@/hooks/use-tasks';
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { TaskAssignmentModal } from '@/components/admin/TaskAssignmentModal';

// Task status badge colors
const statusColors = {
  PENDING: 'amber',
  IN_PROGRESS: 'blue',
  COMPLETED: 'emerald',
  CANCELLED: 'zinc',
  BLOCKED: 'red',
  PENDING_ASSIGNMENT: 'orange',
} as const;

// Task priority badge colors
const priorityColors = {
  LOW: 'zinc',
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

export default function TasksPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const { tasks, pagination, isLoading, error, filters, setFilters } = useTasks({
    page: 1,
    perPage: 10,
  });

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return formatDate(dateString);
  };

  const formatDueDate = (dueDateString?: string | Date) => {
    if (!dueDateString) return null;
    
    const dueDate = new Date(dueDateString);
    if (isNaN(dueDate.getTime())) return null;
    
    const now = new Date();
    const diffInHours = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 0) return { text: 'Overdue', color: 'red' };
    if (diffInHours < 24) return { text: `Due in ${diffInHours}h`, color: 'orange' };
    if (diffInHours < 48) return { text: 'Due tomorrow', color: 'amber' };
    return { text: `Due ${formatDate(dueDateString.toString())}`, color: 'zinc' };
  };

  const getTaskIcon = (type: TaskType) => {
    if (type.includes('REVIEW') || type.includes('APPROVAL')) {
      return CheckCircleIcon;
    }
    if (type.includes('REVISION')) {
      return ExclamationTriangleIcon;
    }
    return DocumentTextIcon;
  };

  // Role-based filtering for task types
  const getAvailableTaskTypes = () => {
    const userRole = session?.user?.staffRole;
    if (!userRole) return [];

    const allTypes = Object.keys(taskTypeNames) as TaskType[];
    
    // Filter based on role
    switch (userRole) {
      case 'INTERN':
        return allTypes.filter(type => 
          type.includes('CREATE') || 
          type.includes('REVISION_TO_AUTHOR') ||
          type.includes('FOLLOW_UP')
        );
      case 'JOURNALIST':
        return allTypes.filter(type => 
          !type.includes('PUBLISH') && 
          !type.includes('APPROVAL')
        );
      case 'SUB_EDITOR':
        return allTypes.filter(type => !type.includes('PUBLISH'));
      default:
        return allTypes;
    }
  };

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading tasks: {error.message}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Tasks"
          searchProps={{
            value: filters.query || '',
            onChange: (value) => handleFilterChange('query', value),
            placeholder: "Search tasks..."
          }}
          action={
            session?.user?.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) ? {
              label: "Assign Task",
              onClick: () => setShowAssignmentModal(true)
            } : undefined
          }
        />

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Status Filters */}
          <Button
            onClick={() => handleFilterChange('status', undefined)}
            color={!filters.status ? 'primary' : 'white'}
            className="text-sm"
          >
            All Statuses
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'PENDING')}
            color={filters.status === 'PENDING' ? 'primary' : 'white'}
            className="text-sm"
          >
            <ClockIcon className="h-4 w-4" />
            Pending
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'IN_PROGRESS')}
            color={filters.status === 'IN_PROGRESS' ? 'primary' : 'white'}
            className="text-sm"
          >
            In Progress
          </Button>
          <Button
            onClick={() => handleFilterChange('status', 'COMPLETED')}
            color={filters.status === 'COMPLETED' ? 'primary' : 'white'}
            className="text-sm"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Completed
          </Button>

          {/* Priority Filters */}
          <div className="border-l border-gray-200 pl-2 ml-2">
            <Button
              onClick={() => handleFilterChange('priority', undefined)}
              color={!filters.priority ? 'primary' : 'white'}
              className="text-sm"
            >
              All Priorities
            </Button>
            <Button
              onClick={() => handleFilterChange('priority', 'URGENT')}
              color={filters.priority === 'URGENT' ? 'primary' : 'white'}
              className="text-sm ml-2"
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
              Urgent
            </Button>
            <Button
              onClick={() => handleFilterChange('priority', 'HIGH')}
              color={filters.priority === 'HIGH' ? 'primary' : 'white'}
              className="text-sm ml-2"
            >
              High Priority
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p>Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={DocumentTextIcon}
            title="No tasks found"
            description="You have no tasks assigned or matching your filters."
            action={
              session?.user?.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) ? {
                label: "Assign Task",
                onClick: () => setShowAssignmentModal(true)
              } : undefined
            }
          />
        ) : (
          <Table striped>
            <thead>
              <tr>
                <th className="w-2/3">Task</th>
                <th className="w-1/6">Status</th>
                <th className="w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const TaskIcon = getTaskIcon(task.type);
                const dueInfo = formatDueDate(task.dueDate);
                
                return (
                  <tr
                    key={task.id}
                    onClick={() => router.push(`/admin/newsroom/tasks/${task.id}`)}
                    className="cursor-pointer hover:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <TaskIcon className="h-6 w-6 text-gray-500" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 truncate">
                              {task.title}
                            </div>
                            <Badge color={priorityColors[task.priority]} className="text-xs">
                              {task.priority}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 truncate">
                            {taskTypeNames[task.type]}
                          </div>
                          {task.story && (
                            <div className="text-sm text-gray-500 truncate">
                              Story: {task.story.title}
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {task.assignedTo.firstName} {task.assignedTo.lastName}
                            </div>
                            {dueInfo && (
                              <div className="flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" />
                                {dueInfo.text}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              {formatRelativeTime(task.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge color={statusColors[task.status]}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <Button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          router.push(`/admin/newsroom/tasks/${task.id}`);
                        }}
                        outline
                        className="text-sm"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}

                 {pagination && pagination.totalPages > 1 && tasks.length > 0 && (
           <div className="flex justify-end">
             <Pagination
               currentPage={pagination.page}
               totalPages={pagination.totalPages}
               onPageChange={handlePageChange}
             />
           </div>
         )}

         {/* Task Assignment Modal */}
         <TaskAssignmentModal
           isOpen={showAssignmentModal}
           onClose={() => setShowAssignmentModal(false)}
         />
       </div>
     </Container>
   );
 } 