'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input, InputGroup } from '@/components/ui/input';

interface Tag {
  id: string;
  name: string;
  slug: string;
  category: string;
  color?: string;
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
}: TagModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(selectedTagIds);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Update selected tags when prop changes
  useEffect(() => {
    setSelectedTags(selectedTagIds);
  }, [selectedTagIds]);

  // Filter tags based on search query
  const filteredTags = tags.filter(tag => {
    if (!searchQuery.trim()) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return tag.name.toLowerCase().includes(searchLower) || 
           tag.category.toLowerCase().includes(searchLower);
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
              <Text className="text-gray-600">
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

              {filteredTags.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Text>
                    {searchQuery ? 'No tags found matching your search' : 'No tags available'}
                  </Text>
                  {searchQuery && (
                    <Text className="text-sm">Try a different search term</Text>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {filteredTags.map((tag) => (
                    <label 
                      key={tag.id} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200 hover:border-kelly-green/30"
                    >
                      <Checkbox
                        checked={selectedTags.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Text className="font-medium">{tag.name}</Text>
                          <Badge color="gray" size="sm">
                            {tag.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <span>{tag._count?.stories || 0} stories</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {required && selectedTags.length === 0 && (
                <div className="text-red-600 text-sm">
                  At least one tag is required
                </div>
              )}

              {selectedTags.length > 0 && (
                <div className="bg-kelly-green/10 p-3 rounded-lg border border-kelly-green/20">
                  <Text className="text-sm text-kelly-green/80">
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
                {isLoading ? 'Saving...' : 'Save Tags'}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 