'use client';

import { useState } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import toast from 'react-hot-toast';

interface CommentFormProps {
  storyId: string;
  onCommentAdded: () => void;
  placeholder?: string;
  buttonText?: string;
}

export function CommentForm({ 
  storyId, 
  onCommentAdded, 
  placeholder = "Add a comment...",
  buttonText = "Add Comment"
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          type: 'GENERAL',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add comment');
      }

      setContent('');
      onCommentAdded();
      toast.success('Comment added successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="resize-none"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? 'Adding...' : buttonText}
        </Button>
      </div>
    </form>
  );
} 