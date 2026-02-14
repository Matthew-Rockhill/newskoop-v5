'use client';

import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface AudioClipDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  clipName: string;
  linkedStoryCount: number;
  isLoading?: boolean;
}

export function AudioClipDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  clipName,
  linkedStoryCount,
  isLoading = false,
}: AudioClipDeleteModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm w-full bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 p-2 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <Heading level={3}>Delete Audio Clip</Heading>
                <Text className="text-zinc-600 mt-2">
                  Are you sure you want to delete <strong>&quot;{clipName}&quot;</strong>?
                </Text>
                {linkedStoryCount > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Text className="text-sm text-amber-800">
                      This clip is linked to <strong>{linkedStoryCount}</strong> {linkedStoryCount === 1 ? 'story' : 'stories'}. Deleting it will remove the audio from all of them.
                    </Text>
                  </div>
                )}
                <Text className="text-sm text-zinc-500 mt-2">
                  This action cannot be undone. The audio file will be permanently deleted.
                </Text>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" color="white" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button color="red" onClick={onConfirm} disabled={isLoading}>
                {isLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
