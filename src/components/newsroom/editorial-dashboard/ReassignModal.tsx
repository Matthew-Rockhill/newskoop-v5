'use client';

import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ReviewerWorkload } from '@/lib/editorial-metrics';

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
  currentAssignee: string | null;
  type: 'reviewer' | 'approver';
  availableUsers: ReviewerWorkload[];
  onReassign: (storyId: string, newAssigneeId: string, type: 'reviewer' | 'approver') => Promise<void>;
}

export function ReassignModal({
  isOpen,
  onClose,
  storyId,
  storyTitle,
  currentAssignee,
  type,
  availableUsers,
  onReassign,
}: ReassignModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      setError('Please select a user to assign');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onReassign(storyId, selectedUserId, type);
      onClose();
      setSelectedUserId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign story');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setSelectedUserId('');
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-zinc-900/50" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <DialogTitle className="text-lg font-semibold text-zinc-900">
              Reassign Story
            </DialogTitle>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <Text className="text-sm font-medium text-zinc-700 mb-2">Story:</Text>
              <Text className="text-sm text-zinc-900 font-medium truncate">
                {storyTitle}
              </Text>
              {currentAssignee && (
                <Text className="text-sm text-zinc-500 mt-1">
                  Currently assigned to: {currentAssignee}
                </Text>
              )}
              {!currentAssignee && (
                <Text className="text-sm text-yellow-600 mt-1">
                  Currently unassigned
                </Text>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="assignee" className="block text-sm font-medium text-zinc-700 mb-2">
                Assign to {type === 'reviewer' ? 'Journalist' : 'Sub-Editor'}:
              </label>
              <select
                id="assignee"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-kelly-green focus:border-transparent disabled:bg-zinc-100"
                required
              >
                <option value="">-- Select a user --</option>
                {availableUsers.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.name} ({user.storiesAssigned} assigned
                    {user.oldestAssignedDays ? `, oldest: ${user.oldestAssignedDays}d` : ''})
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Text className="text-sm text-red-600">{error}</Text>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                color="white"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting || !selectedUserId}
                className="flex items-center gap-2"
              >
                <ArrowPathIcon className="h-4 w-4" />
                {isSubmitting ? 'Reassigning...' : 'Reassign'}
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
