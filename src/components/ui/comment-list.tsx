'use client';

import { Avatar } from './avatar';
import { Button } from './button';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    staffRole?: string;
  };
  replies: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      staffRole?: string;
    };
  }>;
}

interface CommentListProps {
  storyId: string;
  refreshKey?: number;
  onCommentAdded?: () => void;
}

export function CommentList({ storyId, refreshKey = 0, onCommentAdded }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments, refreshKey]);

  // Refresh comments when onCommentAdded is called
  useEffect(() => {
    if (onCommentAdded) {
      fetchComments();
    }
  }, [onCommentAdded, fetchComments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim()) {
      return;
    }

    setIsSubmittingReply(true);
    
    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          type: 'GENERAL',
          parentId: commentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add reply');
      }

      setReplyContent('');
      setReplyingTo(null);
      fetchComments(); // Refresh comments
      toast.success('Reply added successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <p>Loading comments...</p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <p>No comments yet. Be the first to add one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <div key={comment.id} className="border-b border-zinc-200 pb-6 last:border-b-0">
          {/* Main Comment */}
          <div className="flex space-x-3">
            <Avatar
              className="h-8 w-8 flex-shrink-0"
              name={`${comment.author.firstName} ${comment.author.lastName}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-zinc-900">
                  {comment.author.firstName} {comment.author.lastName}
                </span>
                <span className="text-sm text-zinc-500">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <div className="text-zinc-700 whitespace-pre-wrap">
                {comment.content}
              </div>
              
              {/* Reply Button */}
              <div className="mt-2">
                <Button
                  color="white"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                  Reply
                </Button>
              </div>

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="mt-3 pl-4 border-l-2 border-zinc-200">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="w-full p-2 border border-zinc-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-kelly-green"
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <Button
                      color="white"
                      onClick={() => setReplyingTo(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={isSubmittingReply || !replyContent.trim()}
                      onClick={() => handleReply(comment.id)}
                    >
                      {isSubmittingReply ? 'Sending...' : 'Reply'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex space-x-3 pl-4 border-l-2 border-zinc-200">
                      <Avatar
                        className="h-6 w-6 flex-shrink-0"
                        name={`${reply.author.firstName} ${reply.author.lastName}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-zinc-900 text-sm">
                            {reply.author.firstName} {reply.author.lastName}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <div className="text-zinc-700 text-sm whitespace-pre-wrap">
                          {reply.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 