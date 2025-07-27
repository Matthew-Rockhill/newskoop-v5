import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Select } from '@/components/ui/select';

interface Reviewer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ReviewerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reviewerId: string) => void;
  storyTitle: string;
  isLoading?: boolean;
}

export function ReviewerSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  storyTitle,
  isLoading = false,
}: ReviewerSelectionModalProps) {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);

  // Fetch available journalists/reviewers
  useEffect(() => {
    if (isOpen) {
      fetchReviewers();
    }
  }, [isOpen]);

  const fetchReviewers = async () => {
    setIsLoadingReviewers(true);
    try {
      // Fetch only journalists who can review stories
      const response = await fetch('/api/users?staffRole=JOURNALIST&isActive=true&perPage=100');
      if (!response.ok) {
        throw new Error('Failed to fetch reviewers');
      }
      
      const data = await response.json();
      const journalists = data.users || [];
      
      setReviewers(journalists);
      
      // Auto-select first reviewer if available
      if (journalists.length > 0 && !selectedReviewerId) {
        setSelectedReviewerId(journalists[0].id);
      }
    } catch (error) {
      console.error('Error fetching reviewers:', error);
    } finally {
      setIsLoadingReviewers(false);
    }
  };

  const handleConfirm = () => {
    if (selectedReviewerId) {
      onConfirm(selectedReviewerId);
    }
  };

  const selectedReviewer = reviewers.find(r => r.id === selectedReviewerId);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title as={Heading} level={3}>
                Submit for Review
              </Dialog.Title>
              <Button
                type="button"
                color="white"
                onClick={onClose}
                disabled={isLoading}
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <Text className="text-gray-600">
                Select a journalist to review your story:
              </Text>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <Text className="font-medium text-gray-900">&ldquo;{storyTitle}&rdquo;</Text>
              </div>

              {isLoadingReviewers ? (
                <div className="text-center py-4">
                  <Text className="text-gray-500">Loading reviewers...</Text>
                </div>
              ) : reviewers.length === 0 ? (
                <div className="text-center py-4">
                  <Text className="text-red-600">No reviewers available</Text>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Reviewer *
                  </label>
                  <Select
                    value={selectedReviewerId}
                    onChange={(e) => setSelectedReviewerId(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">Choose a reviewer...</option>
                    {reviewers.map((reviewer) => (
                      <option key={reviewer.id} value={reviewer.id}>
                        {reviewer.firstName} {reviewer.lastName} ({reviewer.email})
                      </option>
                    ))}
                  </Select>
                  
                  {selectedReviewer && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Text className="text-sm text-blue-800">
                        <strong>Selected:</strong> {selectedReviewer.firstName} {selectedReviewer.lastName}
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                color="white"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedReviewerId || isLoading || isLoadingReviewers}
              >
                {isLoading ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 