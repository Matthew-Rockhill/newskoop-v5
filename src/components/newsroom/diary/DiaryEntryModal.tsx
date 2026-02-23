'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, Label } from '@/components/ui/fieldset';
import { Text } from '@/components/ui/text';
import { useCreateDiaryEntry, useUpdateDiaryEntry } from '@/hooks/use-diary';
import type { DiaryEntry } from '@/hooks/use-diary';
import { useStories } from '@/hooks/use-stories';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DiaryEntryModalProps {
  open: boolean;
  onClose: () => void;
  entry?: DiaryEntry | null;
}

export function DiaryEntryModal({ open, onClose, entry }: DiaryEntryModalProps) {
  const isEditing = !!entry;

  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [notes, setNotes] = useState('');
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storySearch, setStorySearch] = useState('');
  const [showStorySearch, setShowStorySearch] = useState(false);
  const [selectedStoryTitle, setSelectedStoryTitle] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateDiaryEntry();
  const updateMutation = useUpdateDiaryEntry();

  const { data: storiesData } = useStories({
    query: storySearch,
    perPage: 5,
  });

  useEffect(() => {
    if (open) {
      if (entry) {
        setTitle(entry.title);
        // Format dateTime for datetime-local input
        const dt = new Date(entry.dateTime);
        const formatted = dt.getFullYear() + '-' +
          String(dt.getMonth() + 1).padStart(2, '0') + '-' +
          String(dt.getDate()).padStart(2, '0') + 'T' +
          String(dt.getHours()).padStart(2, '0') + ':' +
          String(dt.getMinutes()).padStart(2, '0');
        setDateTime(formatted);
        setNotes(entry.notes || '');
        setStoryId(entry.storyId);
        setSelectedStoryTitle(entry.story?.title || '');
      } else {
        setTitle('');
        setDateTime('');
        setNotes('');
        setStoryId(null);
        setStorySearch('');
        setSelectedStoryTitle('');
      }
      setError('');
      setShowStorySearch(false);
    }
  }, [open, entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!dateTime) {
      setError('Date/time is required');
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        dateTime: new Date(dateTime).toISOString(),
        notes: notes.trim() || undefined,
        storyId: storyId || undefined,
      };

      if (isEditing && entry) {
        await updateMutation.mutateAsync({
          id: entry.id,
          data: {
            ...payload,
            notes: notes.trim() || null,
            storyId: storyId,
          },
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const stories = storiesData?.stories || [];

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEditing ? 'Edit Diary Entry' : 'New Diary Entry'}</DialogTitle>

        <DialogBody>
          <div className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </div>
            )}

            <Field>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Enter diary entry title"
                required
              />
            </Field>

            <Field>
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTime(e.target.value)}
                required
              />
            </Field>

            <Field>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={3}
              />
            </Field>

            <Field>
              <Label>Link to Story (optional)</Label>
              {storyId && selectedStoryTitle ? (
                <div className="flex items-center gap-2 mt-2 p-2 bg-zinc-50 rounded-md border border-zinc-200">
                  <Text className="flex-1 text-sm text-zinc-900 truncate">{selectedStoryTitle}</Text>
                  <button
                    type="button"
                    onClick={() => {
                      setStoryId(null);
                      setSelectedStoryTitle('');
                      setStorySearch('');
                    }}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative mt-2">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      value={storySearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setStorySearch(e.target.value);
                        setShowStorySearch(true);
                      }}
                      onFocus={() => setShowStorySearch(true)}
                      placeholder="Search stories..."
                      className="pl-9"
                    />
                  </div>
                  {showStorySearch && storySearch.length > 0 && stories.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-zinc-200 max-h-48 overflow-y-auto">
                      {stories.map((story: { id: string; title: string }) => (
                        <button
                          key={story.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0"
                          onClick={() => {
                            setStoryId(story.id);
                            setSelectedStoryTitle(story.title);
                            setStorySearch('');
                            setShowStorySearch(false);
                          }}
                        >
                          {story.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>
          </div>
        </DialogBody>

        <DialogActions>
          <Button type="button" outline onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" color="primary" disabled={isPending}>
            {isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Entry')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
