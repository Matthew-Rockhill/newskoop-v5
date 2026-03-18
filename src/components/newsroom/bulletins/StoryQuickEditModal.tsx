'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';

const RichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })),
  {
    loading: () => (
      <div className="border border-zinc-300 rounded-lg p-4 min-h-[200px] animate-pulse bg-zinc-50">
        Loading editor...
      </div>
    ),
    ssr: false,
  }
);

interface StoryQuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: {
    id: string;
    title: string;
    content: string | null;
  } | null;
  onSaved: (storyId: string, updatedTitle: string, updatedContent: string) => void;
}

export function StoryQuickEditModal({ isOpen, onClose, story, onSaved }: StoryQuickEditModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when story changes
  useEffect(() => {
    if (story) {
      setTitle(story.title);
      setContent(story.content || '');
      setError(null);
    }
  }, [story]);

  const handleSave = async () => {
    if (!story) return;
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/newsroom/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save story');
      }

      onSaved(story.id, title.trim(), content);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save story');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} size="3xl">
      <DialogTitle>Quick Edit Story</DialogTitle>
      <Text className="mt-1 text-sm text-zinc-500">
        Make quick edits to this story without leaving the bulletin.
      </Text>

      <DialogBody>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Content</label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Edit the story content..."
              className="min-h-[300px]"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-600 text-sm">{error}</Text>
            </div>
          )}
        </div>
      </DialogBody>

      <DialogActions>
        <Button
          type="button"
          outline
          onClick={handleClose}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="bg-kelly-green hover:bg-kelly-green/90 text-white"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
