import { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Select } from '@/components/ui/select';

interface SubEditor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SubEditorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subEditorId: string) => void;
  storyTitle: string;
  isLoading?: boolean;
}

export function SubEditorSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  storyTitle,
  isLoading = false,
}: SubEditorSelectionModalProps) {
  const [subEditors, setSubEditors] = useState<SubEditor[]>([]);
  const [selectedSubEditorId, setSelectedSubEditorId] = useState<string>('');
  const [isLoadingSubEditors, setIsLoadingSubEditors] = useState(false);

  const fetchSubEditors = useCallback(async () => {
    setIsLoadingSubEditors(true);
    try {
      // Fetch only sub-editors who can approve stories
      const response = await fetch('/api/users?staffRole=SUB_EDITOR&isActive=true&perPage=100');
      if (!response.ok) {
        throw new Error('Failed to fetch sub-editors');
      }
      
      const data = await response.json();
      const subEditorsList = data.users || [];
      
      setSubEditors(subEditorsList);
      
      // Auto-select first sub-editor if available
      if (subEditorsList.length > 0 && !selectedSubEditorId) {
        setSelectedSubEditorId(subEditorsList[0].id);
      }
    } catch (error) {
      console.error('Error fetching sub-editors:', error);
    } finally {
      setIsLoadingSubEditors(false);
    }
  }, [selectedSubEditorId]);

  // Fetch available sub-editors
  useEffect(() => {
    if (isOpen) {
      fetchSubEditors();
    }
  }, [isOpen, fetchSubEditors]);

  const handleConfirm = () => {
    if (selectedSubEditorId) {
      onConfirm(selectedSubEditorId);
    }
  };

  const selectedSubEditor = subEditors.find(s => s.id === selectedSubEditorId);

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
                Submit for Approval
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
                Select a sub-editor to approve your story:
              </Text>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <Text className="font-medium text-gray-900">&ldquo;{storyTitle}&rdquo;</Text>
              </div>

              {isLoadingSubEditors ? (
                <div className="text-center py-4">
                  <Text className="text-gray-500">Loading sub-editors...</Text>
                </div>
              ) : subEditors.length === 0 ? (
                <div className="text-center py-4">
                  <Text className="text-red-600">No sub-editors available</Text>
                </div>
              ) : (
                <div className="space-y-3">
                  <Text className="block text-sm font-medium text-gray-700">
                    Select Sub-Editor *
                  </Text>
                  <Select
                    value={selectedSubEditorId}
                    onChange={(e) => setSelectedSubEditorId(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">Choose a sub-editor...</option>
                    {subEditors.map((subEditor) => (
                      <option key={subEditor.id} value={subEditor.id}>
                        {subEditor.firstName} {subEditor.lastName} ({subEditor.email})
                      </option>
                    ))}
                  </Select>
                  
                  {selectedSubEditor && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Text className="text-sm text-blue-800">
                        <strong>Selected:</strong> {selectedSubEditor.firstName} {selectedSubEditor.lastName}
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
                disabled={!selectedSubEditorId || isLoading || isLoadingSubEditors}
              >
                {isLoading ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 