'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';
import { Textarea } from '@/components/ui/textarea';

interface AudioClipEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title?: string; description?: string; tags?: string[] }) => void;
  clip: {
    title?: string | null;
    description?: string | null;
    tags?: string[];
  } | null;
  isLoading?: boolean;
}

export function AudioClipEditModal({
  isOpen,
  onClose,
  onSave,
  clip,
  isLoading = false,
}: AudioClipEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (clip) {
      setTitle(clip.title || '');
      setDescription(clip.description || '');
      setTagsInput(clip.tags?.join(', ') || '');
    }
  }, [clip]);

  const handleSave = () => {
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onSave({
      title: title || undefined,
      description: description || undefined,
      tags,
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title as={Heading} level={3}>
                Edit Audio Clip
              </Dialog.Title>
              <Button type="button" color="white" onClick={onClose}>
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <Field>
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give this clip a title..."
                />
              </Field>

              <Field>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </Field>

              <Field>
                <Label>Tags</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="news, interview, english (comma-separated)"
                />
                <Text className="text-xs text-zinc-500 mt-1">Separate tags with commas</Text>
              </Field>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" color="white" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
