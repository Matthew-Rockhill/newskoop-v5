'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, InputGroup } from '@/components/ui/input';

interface Tag {
  id: string;
  name: string;
  slug: string;
  _count?: {
    stories: number;
  };
}

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tagIds: string[]) => void;
  tags: Tag[];
  selectedTagIds: string[];
  title: string;
  description: string;
  required?: boolean;
  isLoading?: boolean;
  showSearch?: boolean; // New prop to control search visibility
  singleSelect?: boolean; // New prop for single selection (radio button behavior)
  confirmButtonText?: string; // Custom text for confirm button
  allowCreate?: boolean; // Allow creating new tags
  onTagCreate?: (name: string) => Promise<Tag | null>; // Callback when a new tag is created
}

export function TagModal({
  isOpen,
  onClose,
  onConfirm,
  tags,
  selectedTagIds,
  title,
  description,
  required = false,
  isLoading = false,
  showSearch = true, // Default to true
  singleSelect = false, // Default to false (multi-select)
  confirmButtonText = 'Confirm', // Default button text
  allowCreate = false, // Default to false
  onTagCreate,
}: TagModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(selectedTagIds);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Update selected tags when prop changes
  useEffect(() => {
    setSelectedTags(selectedTagIds);
  }, [selectedTagIds]);

  // Filter tags based on search query
  const filteredTags = tags.filter(tag => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    return tag.name.toLowerCase().includes(searchLower);
  });

  const handleTagToggle = (tagId: string) => {
    if (singleSelect) {
      // Radio button behavior - always set the selected tag
      setSelectedTags([tagId]);
    } else {
      // Checkbox behavior - toggle the tag
      setSelectedTags(prev =>
        prev.includes(tagId)
          ? prev.filter(id => id !== tagId)
          : [...prev, tagId]
      );
    }
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim() || !onTagCreate) return;

    setIsCreating(true);
    try {
      const newTag = await onTagCreate(searchQuery.trim());
      if (newTag) {
        // Auto-select the newly created tag
        if (singleSelect) {
          setSelectedTags([newTag.id]);
        } else {
          setSelectedTags(prev => [...prev, newTag.id]);
        }
        setSearchQuery('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Check if search query matches an existing tag exactly
  const exactMatch = tags.some(
    tag => tag.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );
  const canCreateTag = allowCreate && onTagCreate && searchQuery.trim() && !exactMatch;

  const handleConfirm = () => {
    if (!required || selectedTags.length > 0) {
      onConfirm(selectedTags);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedTags(selectedTagIds);
    onClose();
  };

  const isValid = !required || selectedTags.length > 0;

  const selectedTagNames = tags
    .filter(tag => selectedTags.includes(tag.id))
    .map(tag => tag.name);

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title as={Heading} level={3}>
                {title}
              </Dialog.Title>
              <Button
                type="button"
                color="white"
                onClick={handleClose}
                disabled={isLoading}
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <Text className="text-zinc-600">
                {description}
              </Text>

              {showSearch && (
                <>
                  {/* Search Bar */}
                  <InputGroup>
                    <MagnifyingGlassIcon 
                      className="h-5 w-5 text-zinc-400" 
                      data-slot="icon" 
                    />
                    <Input
                      type="search"
                      placeholder="Search tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </InputGroup>
                </>
              )}

              {/* Create new tag button */}
              {canCreateTag && (
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={isCreating}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 cursor-pointer border border-emerald-200 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-emerald-500 text-white">
                    <PlusIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <Text className="font-medium text-emerald-700">
                      {isCreating ? 'Creating...' : `Create "${searchQuery.trim()}"`}
                    </Text>
                  </div>
                </button>
              )}

              {filteredTags.length === 0 && !canCreateTag ? (
                <div className="text-center py-8 text-zinc-500">
                  <Text>
                    {searchQuery ? 'No tags found matching your search' : 'No tags available'}
                  </Text>
                  {searchQuery && !allowCreate && (
                    <Text className="text-sm">Try a different search term</Text>
                  )}
                </div>
              ) : filteredTags.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {filteredTags.map((tag) => (
                    <label 
                      key={tag.id} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 cursor-pointer border border-zinc-200 hover:border-kelly-green/30"
                    >
                      <Checkbox
                        checked={selectedTags.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Text className="font-medium">{tag.name}</Text>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <div className="flex items-center gap-1">
                            <span>{tag._count?.stories || 0} stories</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : null}

              {required && selectedTags.length === 0 && (
                <div className="text-red-600 text-sm">
                  At least one tag is required
                </div>
              )}

              {selectedTags.length > 0 && (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <Text className="text-sm text-emerald-700">
                    <strong>Selected:</strong> {selectedTagNames.join(', ')}
                  </Text>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                color="white"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!isValid || isLoading}
              >
                {isLoading ? 'Saving...' : confirmButtonText}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 