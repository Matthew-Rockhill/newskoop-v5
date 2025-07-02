'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Fieldset, Field, Label } from '@/components/ui/fieldset';
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

import type { Task } from '@/types';
import { useSession } from 'next-auth/react';

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
  type: z.enum(['GENERAL', 'REVISION_REQUEST', 'APPROVAL', 'REJECTION', 'EDITORIAL_NOTE']).default('GENERAL'),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface TaskComment {
  id: string;
  content: string;
  type: 'GENERAL' | 'REVISION_REQUEST' | 'APPROVAL' | 'REJECTION' | 'EDITORIAL_NOTE';
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    staffRole: string;
  };
}

interface TaskCommentsProps {
  task: Task;
  comments?: TaskComment[];
  onCommentAdded?: () => void;
}

const commentTypeConfig = {
  GENERAL: {
    label: 'General',
    color: 'zinc',
    icon: ChatBubbleLeftRightIcon,
    description: 'General comment or note',
  },
  REVISION_REQUEST: {
    label: 'Revision Request',
    color: 'orange',
    icon: ExclamationTriangleIcon,
    description: 'Request changes or revisions',
  },
  APPROVAL: {
    label: 'Approval',
    color: 'emerald',
    icon: CheckCircleIcon,
    description: 'Approve or sign off',
  },
  REJECTION: {
    label: 'Rejection',
    color: 'red',
    icon: ExclamationTriangleIcon,
    description: 'Reject or request major changes',
  },
  EDITORIAL_NOTE: {
    label: 'Editorial Note',
    color: 'blue',
    icon: InformationCircleIcon,
    description: 'Editorial guidance or note',
  },
} as const;

export function TaskComments({ task, comments = [], onCommentAdded }: TaskCommentsProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      type: 'GENERAL',
    },
  });

  const selectedType = watch('type');
  const typeConfig = commentTypeConfig[selectedType];

  const onSubmit = async (data: CommentFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add comment');
      }

      toast.success('Comment added successfully!');
      reset();
      setShowCommentForm(false);
      onCommentAdded?.();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCommentIcon = (type: string) => {
    const config = commentTypeConfig[type as keyof typeof commentTypeConfig];
    return config?.icon || ChatBubbleLeftRightIcon;
  };

  const getCommentColor = (type: string) => {
    const config = commentTypeConfig[type as keyof typeof commentTypeConfig];
    return config?.color || 'zinc';
  };

  return (
    <div className="space-y-6">
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">
            Task Comments ({comments.length})
          </h3>
        </div>
        
        {!showCommentForm && (
          <Button
            size="sm"
            color="white"
            onClick={() => setShowCommentForm(true)}
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
            Add Comment
          </Button>
        )}
      </div>

      {/* Add Comment Form */}
      {showCommentForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Fieldset>
              <Field>
                <Label htmlFor="type">Comment Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(commentTypeConfig).map(([value, config]) => (
                    <label
                      key={value}
                      className={`
                        flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors
                        ${selectedType === value 
                          ? 'border-blue-500 bg-blue-50 text-blue-900' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        {...register('type')}
                        value={value}
                        className="sr-only"
                      />
                      <config.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{config.label}</span>
                    </label>
                  ))}
                </div>
                {typeConfig && (
                  <p className="text-sm text-gray-600 mt-1">{typeConfig.description}</p>
                )}
              </Field>

              <Field>
                <Label htmlFor="content">Comment</Label>
                <Textarea
                  {...register('content')}
                  rows={3}
                  placeholder="Add your comment..."
                />
                {errors.content && (
                  <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>
                )}
              </Field>
            </Fieldset>

            <div className="flex items-center justify-end space-x-3">
              <Button
                type="button"
                color="secondary"
                size="sm"
                onClick={() => {
                  setShowCommentForm(false);
                  reset();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                {isSubmitting ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No comments yet</p>
            <p className="text-sm">Add a comment to communicate about this task</p>
          </div>
        ) : (
          comments.map((comment) => {
            const CommentIcon = getCommentIcon(comment.type);
            const commentColor = getCommentColor(comment.type);
            
            return (
              <div
                key={comment.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    className="h-8 w-8 flex-shrink-0"
                    name={`${comment.author.firstName} ${comment.author.lastName}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">
                        {comment.author.firstName} {comment.author.lastName}
                      </span>
                      <Badge color="zinc" className="text-xs">
                        {comment.author.staffRole}
                      </Badge>
                      <Badge color={commentColor as any} className="text-xs">
                        <CommentIcon className="h-3 w-3 mr-1" />
                        {commentTypeConfig[comment.type]?.label}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="text-gray-700 text-sm whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default TaskComments; 