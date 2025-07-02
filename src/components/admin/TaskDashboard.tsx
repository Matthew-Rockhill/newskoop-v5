'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Divider } from '@/components/ui/divider';

import { useTasks } from '@/hooks/use-tasks';
import { TaskCard } from './TaskCard';
import type { TaskFilters } from '@/types';
import { useSession } from 'next-auth/react';

interface TaskDashboardProps {
  className?: string;
}

export function TaskDashboard({ className = '' }: TaskDashboardProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');

  // Get user's pending tasks
  const { data: pendingData } = useTasks({
    status: 'PENDING',
    assignedToId: session?.user?.id,
    perPage: 5,
  });

  // Get user's overdue tasks
  const { data: overdueData } = useTasks({
    assignedToId: session?.user?.id,
    perPage: 3,
  });

  // Get recent completed tasks
  const { data: completedData } = useTasks({
    status: 'COMPLETED',
    assignedToId: session?.user?.id,
    perPage: 3,
  });

  const pendingTasks = pendingData?.tasks || [];
  const allTasks = overdueData?.tasks || [];
  const completedTasks = completedData?.tasks || [];

  // Filter overdue tasks
  const overdueTasks = allTasks.filter(task => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  });

  // Get role-specific stats
  const getRoleSpecificStats = () => {
    const userRole = session?.user?.staffRole;
    
    switch (userRole) {
      case 'INTERN':
        return {
          title: 'My Writing Tasks',
          description: 'Stories to write and revisions to complete',
          primaryAction: { label: 'New Story', href: '/admin/newsroom/stories/new' },
        };
      case 'JOURNALIST':
        return {
          title: 'Review & Editorial Tasks',
          description: 'Stories to review and editorial work',
          primaryAction: { label: 'View All Tasks', href: '/admin/newsroom/tasks' },
        };
      case 'SUB_EDITOR':
        return {
          title: 'Editorial Workflow',
          description: 'Approvals, categorization, and translations',
          primaryAction: { label: 'Assign Task', href: '/admin/newsroom/tasks/new' },
        };
      default:
        return {
          title: 'Task Management',
          description: 'Oversee newsroom workflow and assignments',
          primaryAction: { label: 'Assign Task', href: '/admin/newsroom/tasks/new' },
        };
    }
  };

  const roleStats = getRoleSpecificStats();

  // Quick stats
  const stats = [
    {
      name: 'Pending Tasks',
      value: pendingTasks.length,
      color: 'blue',
      icon: ClockIcon,
    },
    {
      name: 'Overdue',
      value: overdueTasks.length,
      color: overdueTasks.length > 0 ? 'red' : 'gray',
      icon: ExclamationTriangleIcon,
    },
    {
      name: 'Completed Today',
      value: completedTasks.filter(task => {
        if (!task.completedAt) return false;
        const completedDate = new Date(task.completedAt);
        const today = new Date();
        return completedDate.toDateString() === today.toDateString();
      }).length,
      color: 'emerald',
      icon: CheckCircleIcon,
    },
  ];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level={2}>{roleStats.title}</Heading>
          <Text className="text-gray-600 mt-1">{roleStats.description}</Text>
        </div>
        <Button href={roleStats.primaryAction.href}>
          <PlusIcon className="h-4 w-4" />
          {roleStats.primaryAction.label}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon 
                  className={`h-6 w-6 ${
                    stat.color === 'red' ? 'text-red-500' :
                    stat.color === 'blue' ? 'text-blue-500' :
                    stat.color === 'emerald' ? 'text-emerald-500' :
                    'text-gray-400'
                  }`} 
                />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Task Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent/Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <Heading level={3} className="text-red-700">Overdue Tasks</Heading>
              </div>
              <Badge color="red" size="sm">
                {overdueTasks.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {overdueTasks.slice(0, 3).map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  showAssignee={false}
                  className="border-red-200 bg-red-50"
                />
              ))}
              {overdueTasks.length > 3 && (
                <div className="text-center pt-2">
                  <Link 
                    href="/admin/newsroom/tasks?status=overdue"
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    View {overdueTasks.length - 3} more overdue tasks
                  </Link>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Pending Tasks */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-blue-500" />
              <Heading level={3}>Pending Tasks</Heading>
            </div>
            <Badge color="blue" size="sm">
              {pendingTasks.length}
            </Badge>
          </div>
          {pendingTasks.length > 0 ? (
            <div className="space-y-3">
              {pendingTasks.slice(0, 3).map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  showAssignee={false}
                />
              ))}
              {pendingTasks.length > 3 && (
                <div className="text-center pt-2">
                  <Link 
                    href="/admin/newsroom/tasks?status=PENDING"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View {pendingTasks.length - 3} more pending tasks
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <Text className="text-gray-500">No pending tasks</Text>
              <Text className="text-sm text-gray-400">You're all caught up!</Text>
            </div>
          )}
        </Card>

        {/* Recently Completed */}
        {completedTasks.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                <Heading level={3}>Recently Completed</Heading>
              </div>
              <Badge color="emerald" size="sm">
                {completedTasks.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {completedTasks.slice(0, 3).map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  showAssignee={false}
                  className="opacity-75"
                />
              ))}
              {completedTasks.length > 3 && (
                <div className="text-center pt-2">
                  <Link 
                    href="/admin/newsroom/tasks?status=COMPLETED"
                    className="text-sm text-emerald-600 hover:text-emerald-800"
                  >
                    View all completed tasks
                  </Link>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="p-6 mt-6">
        <Heading level={3} className="mb-4">Quick Actions</Heading>
        <div className="flex flex-wrap gap-3">
          <Button href="/admin/newsroom/stories/new" color="white">
            New Story
          </Button>
          <Button href="/admin/newsroom/tasks?status=PENDING" color="white">
            View All Pending Tasks
          </Button>
          {session?.user?.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole) && (
            <Button href="/admin/newsroom/tasks/new" color="white">
              Assign New Task
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default TaskDashboard; 