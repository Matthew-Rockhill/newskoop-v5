'use client';

import { useState, MouseEvent, KeyboardEvent } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useReassignmentUsers, useReassignStory, ReassignmentType } from '@/hooks/use-reassignment';
import toast from 'react-hot-toast';

interface ReassignButtonProps {
  storyId: string;
  storyTitle: string;
  currentAssignee: string | null;
  type: ReassignmentType;
  targetLanguage?: string; // Required for translator type (AFRIKAANS, XHOSA)
  compact?: boolean;
  onReassigned?: () => void;
}

export function ReassignButton({
  storyId,
  storyTitle,
  currentAssignee,
  type,
  targetLanguage,
  compact = true,
  onReassigned,
}: ReassignButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Fetch available users when modal is open
  const { data: availableUsers = [], isLoading: isLoadingUsers } = useReassignmentUsers({
    type,
    targetLanguage,
    enabled: isOpen,
  });

  const reassignMutation = useReassignStory();

  const handleOpen = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(true);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    if (!reassignMutation.isPending) {
      setIsOpen(false);
      setSelectedUserId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error('Please select a user to assign');
      return;
    }

    try {
      await reassignMutation.mutateAsync({
        storyId,
        assignedToId: selectedUserId,
        type,
      });
      toast.success('Story reassigned successfully');
      setIsOpen(false);
      setSelectedUserId('');
      onReassigned?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reassign story');
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'reviewer':
        return 'Journalist';
      case 'approver':
        return 'Sub-Editor';
      case 'translator':
        return `Translator (${targetLanguage})`;
      default:
        return 'User';
    }
  };

  return (
    <>
      {/* Reassign Button */}
      <button
        type="button"
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        className={`
          inline-flex items-center justify-center rounded-md
          text-zinc-500 hover:text-kelly-green hover:bg-zinc-100
          dark:text-zinc-400 dark:hover:text-kelly-green dark:hover:bg-zinc-800
          focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2
          transition-colors
          ${compact ? 'p-1.5' : 'px-3 py-1.5 gap-1.5'}
        `}
        title="Reassign story"
        aria-label={`Reassign "${storyTitle}"`}
      >
        <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
        {!compact && <span className="text-sm">Reassign</span>}
      </button>

      {/* Modal */}
      <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-zinc-900/50" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
              <DialogTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Reassign Story
              </DialogTitle>
              <button
                onClick={handleClose}
                disabled={reassignMutation.isPending}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Story:</Text>
                <Text className="text-sm text-zinc-900 dark:text-zinc-100 font-medium line-clamp-2">
                  {storyTitle}
                </Text>
                {currentAssignee && (
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Currently assigned to: {currentAssignee}
                  </Text>
                )}
                {!currentAssignee && (
                  <Text className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                    Currently unassigned
                  </Text>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="assignee" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Assign to {getTypeLabel()}:
                </label>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-kelly-green"></div>
                  </div>
                ) : (
                  <select
                    id="assignee"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={reassignMutation.isPending}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-kelly-green focus:border-transparent disabled:bg-zinc-100 dark:disabled:bg-zinc-700"
                    required
                  >
                    <option value="">-- Select a user --</option>
                    {availableUsers.map((user) => (
                      <option key={user.userId} value={user.userId}>
                        {user.name}
                        {user.storiesAssigned > 0 && ` (${user.storiesAssigned} assigned)`}
                        {user.oldestAssignedDays ? `, oldest: ${user.oldestAssignedDays}d` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {availableUsers.length === 0 && !isLoadingUsers && (
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                    No available users found for this assignment type.
                  </Text>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  color="white"
                  onClick={handleClose}
                  disabled={reassignMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={reassignMutation.isPending || !selectedUserId || isLoadingUsers}
                  className="flex items-center gap-2"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${reassignMutation.isPending ? 'animate-spin' : ''}`} />
                  {reassignMutation.isPending ? 'Reassigning...' : 'Reassign'}
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
