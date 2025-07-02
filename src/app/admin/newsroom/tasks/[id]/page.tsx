'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircleIcon,
  XMarkIcon,
  PencilSquareIcon,
  UserPlusIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Divider } from '@/components/ui/divider';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';

import { useTask, useTasks } from '@/hooks/use-tasks';
import { TaskAssignmentModal } from '@/components/admin/TaskAssignmentModal';
import { TaskEditModal } from '@/components/admin/TaskEditModal';
import { TaskComments } from '@/components/admin/TaskComments';
import { TaskType, TaskStatus, TaskPriority } from '@prisma/client';
import { useSession } from 'next-auth/react';

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

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const { data: session } = useSession();
  
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Fetch task data
  const { data: task, isLoading, error } = useTask(taskId);
  
  // Get task management hooks
  const { completeTask, updateTask } = useTasks();

  // Fetch comments when task is loaded
  const fetchComments = async () => {
    if (!task) return;
    
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Fetch comments when task changes
  React.useEffect(() => {
    if (task) {
      fetchComments();
    }
  }, [task]);

  const handleCompleteTask = async () => {
    if (!task || isCompleting) return;
    
    setIsCompleting(true);
    try {
      await completeTask({ id: task.id, metadata: {} });
      toast.success('Task completed successfully!');
    } catch (error) {
      toast.error('Failed to complete task');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    if (!task || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await updateTask({ 
        id: task.id, 
        data: { status: newStatus } 
      });
      toast.success('Task status updated successfully!');
    } catch (error) {
      toast.error('Failed to update task status');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDueDate = (dueDate?: Date | null) => {
    if (!dueDate) return null;
    
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    const diffInHours = Math.floor((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 0) return { text: 'Overdue', color: 'red', urgent: true };
    if (diffInHours < 24) return { text: `Due in ${diffInHours}h`, color: 'orange', urgent: true };
    if (diffInHours < 48) return { text: 'Due tomorrow', color: 'amber', urgent: false };
    return { text: `Due ${formatDate(dueDate.toString())}`, color: 'gray', urgent: false };
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

  const canCompleteTask = () => {
    if (!task || !session?.user) return false;
    return task.assignedTo.id === session.user.id && task.status !== 'COMPLETED';
  };

  const canEditTask = () => {
    if (!task || !session?.user) return false;
    const userRole = session.user.staffRole;
    return task.assignedTo.id === session.user.id ||
           task.createdBy.id === session.user.id ||
           ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole || '');
  };

  const canReassignTask = () => {
    if (!task || !session?.user) return false;
    const userRole = session.user.staffRole;
    return task.createdBy.id === session.user.id ||
           ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole || '');
  };

  const getAvailableActions = () => {
    const actions = [];
    
    if (canCompleteTask()) {
      actions.push({
        label: 'Mark Complete',
        action: handleCompleteTask,
        color: 'emerald',
        icon: CheckCircleIcon,
        loading: isCompleting,
      });
    }
    
    if (task?.status === 'PENDING' && canEditTask()) {
      actions.push({
        label: 'Start Task',
        action: () => handleUpdateStatus('IN_PROGRESS'),
        color: 'blue',
        icon: ClockIcon,
        loading: isUpdating,
      });
    }
    
    return actions;
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading task...</p>
        </div>
      </Container>
    );
  }

  if (error || !task) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading task: {error?.message || 'Task not found'}</p>
          <Button asChild className="mt-4">
            <Link href="/admin/newsroom/tasks">Back to Tasks</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const TaskIcon = getTaskIcon(task.type);
  const dueInfo = formatDueDate(task.dueDate);
  const availableActions = getAvailableActions();

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title={task.title}
          description={`Task #${task.id.slice(-8)} • ${taskTypeNames[task.type]}`}
          action={{
            label: "Back to Tasks",
            onClick: () => router.push('/admin/newsroom/tasks')
          }}
        />

        {/* Action Buttons Row */}
        <div className="flex flex-wrap gap-2">
          {/* Status Actions */}
          {availableActions.map((action) => (
            <Button
              key={action.label}
              color={action.color as any}
              onClick={action.action}
              disabled={action.loading}
            >
              <action.icon className="h-4 w-4" />
              {action.loading ? 'Processing...' : action.label}
            </Button>
          ))}
          
          {/* Edit Button */}
          {canEditTask() && (
            <Button 
              color="white"
              onClick={() => setShowEditModal(true)}
            >
              <PencilSquareIcon className="h-4 w-4" />
              Edit
            </Button>
          )}

          {/* Reassign Button */}
          {canReassignTask() && (
            <Button 
              color="white"
              onClick={() => setShowAssignmentModal(true)}
            >
              <UserPlusIcon className="h-4 w-4" />
              Reassign
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details */}
            <Card className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <TaskIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">{task.title}</h1>
                      <p className="text-sm text-gray-500 mt-1">{taskTypeNames[task.type]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      <Badge color={statusColors[task.status]}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  {dueInfo && (
                    <div className="mt-3">
                      <Badge 
                        color={dueInfo.color as any} 
                        className={dueInfo.urgent ? 'animate-pulse' : ''}
                      >
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {dueInfo.text}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {task.description && (
                <>
                  <Divider className="my-6" />
                  <div>
                    <Heading level={3} className="mb-3">Description</Heading>
                    <Text className="text-gray-700 whitespace-pre-wrap">
                      {task.description}
                    </Text>
                  </div>
                </>
              )}

              {/* Task-specific content */}
              {task.type.includes('APPROVAL') && task.metadata && (
                <>
                  <Divider className="my-6" />
                  <div>
                    <Heading level={3} className="mb-3">Approval Checklist</Heading>
                    <div className="space-y-2">
                      {/* This would be populated from task metadata */}
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Fact-checked</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Categorized</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Tagged appropriately</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* Related Story */}
            {task.story && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level={3}>Related Story</Heading>
                  <Button asChild size="sm" color="white">
                    <Link href={`/admin/newsroom/stories/${task.story.id}`}>
                      View Story
                    </Link>
                  </Button>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <DocumentTextIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.story.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        by {task.story.author.firstName} {task.story.author.lastName}
                      </p>
                      <Badge color="zinc" className="mt-2">
                        {task.story.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Comments Section */}
            <Card className="p-6">
              <TaskComments
                task={task}
                comments={comments}
                onCommentAdded={fetchComments}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignment */}
            <Card className="p-6">
              <Heading level={3} className="mb-4">Assignment</Heading>
              
              <DescriptionList>
                <DescriptionTerm>Assigned To</DescriptionTerm>
                <DescriptionDetails>
                  <div className="flex items-center space-x-2">
                    <Avatar
                      className="h-6 w-6"
                      name={`${task.assignedTo.firstName} ${task.assignedTo.lastName}`}
                    />
                    <span>{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
                    <Badge color="zinc">
                      {task.assignedTo.staffRole}
                    </Badge>
                  </div>
                </DescriptionDetails>

                <DescriptionTerm>Created By</DescriptionTerm>
                <DescriptionDetails>
                  <div className="flex items-center space-x-2">
                    <Avatar
                      className="h-6 w-6"
                      name={`${task.createdBy.firstName} ${task.createdBy.lastName}`}
                    />
                    <span>{task.createdBy.firstName} {task.createdBy.lastName}</span>
                  </div>
                </DescriptionDetails>
              </DescriptionList>
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <Heading level={3} className="mb-4">Timeline</Heading>
              
              <DescriptionList>
                <DescriptionTerm>Created</DescriptionTerm>
                <DescriptionDetails>
                  {formatDate(task.createdAt)}
                </DescriptionDetails>

                <DescriptionTerm>Last Updated</DescriptionTerm>
                <DescriptionDetails>
                  {formatDate(task.updatedAt)}
                </DescriptionDetails>

                {task.dueDate && (
                  <>
                    <DescriptionTerm>Due Date</DescriptionTerm>
                    <DescriptionDetails>
                      <div className="flex items-center gap-2">
                        <span>{formatDate(task.dueDate)}</span>
                        {dueInfo && (
                          <Badge color={dueInfo.color as any}>
                            {dueInfo.text}
                          </Badge>
                        )}
                      </div>
                    </DescriptionDetails>
                  </>
                )}

                {task.completedAt && (
                  <>
                    <DescriptionTerm>Completed</DescriptionTerm>
                    <DescriptionDetails>
                      {formatDate(task.completedAt)}
                    </DescriptionDetails>
                  </>
                )}
              </DescriptionList>
            </Card>

            {/* Translation Details */}
            {task.type.includes('TRANSLATE') && (
              <Card className="p-6">
                <Heading level={3} className="mb-4">Translation Details</Heading>
                
                <DescriptionList>
                  {task.sourceLanguage && (
                    <>
                      <DescriptionTerm>Source Language</DescriptionTerm>
                      <DescriptionDetails>
                        <Badge color="blue">
                          {task.sourceLanguage}
                        </Badge>
                      </DescriptionDetails>
                    </>
                  )}

                  {task.targetLanguage && (
                    <>
                      <DescriptionTerm>Target Language</DescriptionTerm>
                      <DescriptionDetails>
                        <Badge color="green">
                          {task.targetLanguage}
                        </Badge>
                      </DescriptionDetails>
                    </>
                  )}
                </DescriptionList>
              </Card>
            )}
          </div>
        </div>

        {/* Task Assignment Modal */}
        <TaskAssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => setShowAssignmentModal(false)}
          preselectedStoryId={task.story?.id}
          preselectedType={task.type}
        />

        {/* Task Edit Modal */}
        <TaskEditModal
          task={task}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            // Refresh task data after successful edit
            window.location.reload();
          }}
        />
      </div>
    </Container>
  );
} 