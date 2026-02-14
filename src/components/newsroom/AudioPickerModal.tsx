'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { MusicalNoteIcon } from '@heroicons/react/24/solid';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input, InputGroup } from '@/components/ui/input';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { useAudioLibrary, type AudioClip } from '@/hooks/use-audio-library';

interface AudioPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (clipIds: string[]) => void;
  excludeClipIds?: string[];
  isLoading?: boolean;
}

export function AudioPickerModal({
  isOpen,
  onClose,
  onConfirm,
  excludeClipIds = [],
  isLoading = false,
}: AudioPickerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading: isLoadingClips } = useAudioLibrary({
    query: debouncedQuery || undefined,
    perPage: 50,
  });

  const clips: AudioClip[] = (data?.clips || []).filter(
    (clip: AudioClip) => !excludeClipIds.includes(clip.id)
  );

  const handleToggle = useCallback((clipId: string) => {
    setSelectedIds(prev =>
      prev.includes(clipId)
        ? prev.filter(id => id !== clipId)
        : [...prev, clipId]
    );
  }, []);

  const handleConfirm = () => {
    onConfirm(selectedIds);
    setSelectedIds([]);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearchQuery('');
    onClose();
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-lg shadow-xl max-h-[80vh] flex flex-col">
          <div className="p-6 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title as={Heading} level={3}>
                Browse Audio Library
              </Dialog.Title>
              <Button type="button" color="white" onClick={handleClose}>
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            <InputGroup>
              <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" data-slot="icon" />
              <Input
                type="search"
                placeholder="Search by name, tag, or story..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-2">
            {isLoadingClips ? (
              <div className="text-center py-8 text-zinc-500">
                <Text>Loading audio clips...</Text>
              </div>
            ) : clips.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <MusicalNoteIcon className="h-12 w-12 mx-auto mb-2 text-zinc-300" />
                <Text>{searchQuery ? 'No clips found matching your search' : 'No audio clips available'}</Text>
              </div>
            ) : (
              <div className="space-y-2">
                {clips.map((clip) => (
                  <label
                    key={clip.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 cursor-pointer border border-zinc-200 hover:border-kelly-green/30"
                  >
                    <Checkbox
                      checked={selectedIds.includes(clip.id)}
                      onChange={() => handleToggle(clip.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Text className="font-medium truncate">
                          {clip.title || clip.originalName}
                        </Text>
                        {clip.duration && (
                          <Badge color="zinc" className="text-xs flex-shrink-0">
                            {formatDuration(clip.duration)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {clip.tags?.map((tag) => (
                          <Badge key={tag} color="blue" className="text-xs">{tag}</Badge>
                        ))}
                        {clip.sourceStory && (
                          <Text className="text-xs text-zinc-400 truncate">
                            from: {clip.sourceStory.title}
                          </Text>
                        )}
                      </div>
                      {clip.uploader && (
                        <Text className="text-xs text-zinc-400 mt-1">
                          by {clip.uploader.firstName} {clip.uploader.lastName}
                        </Text>
                      )}
                      <div className="mt-2">
                        <CustomAudioPlayer
                          clip={{
                            id: clip.id,
                            url: clip.url,
                            originalName: clip.title || clip.originalName,
                            duration: clip.duration ?? null,
                            mimeType: clip.mimeType,
                          }}
                          compact
                        />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 flex-shrink-0 border-t border-zinc-200">
            {selectedIds.length > 0 && (
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 mb-3">
                <Text className="text-sm text-emerald-700">
                  <strong>{selectedIds.length}</strong> clip{selectedIds.length !== 1 ? 's' : ''} selected
                </Text>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" color="white" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedIds.length === 0 || isLoading}
              >
                {isLoading ? 'Attaching...' : `Attach Selected (${selectedIds.length})`}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
