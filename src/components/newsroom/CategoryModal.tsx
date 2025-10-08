'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, FolderIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input, InputGroup } from '@/components/ui/input';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  level: number;
  isParent: boolean;
  isEditable: boolean;
  parent?: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    stories: number;
    children: number;
  };
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (categoryId: string) => void;
  categories: Category[];
  selectedCategoryId?: string;
  isLoading?: boolean;
  filterEditable?: boolean; // Only show editable categories (for admin/editor context)
}

// Helper to build breadcrumb path
function getCategoryBreadcrumb(category: Category): string {
  const path = [category.name];
  let current: Category | undefined = category.parent as Category | undefined;
  while (current) {
    path.unshift(current.name);
    current = current.parent as Category | undefined;
  }
  return path.join(' > ');
}

export function CategoryModal({
  isOpen,
  onClose,
  onConfirm,
  categories,
  selectedCategoryId,
  isLoading = false,
  filterEditable = true, // Default to true for backwards compatibility
}: CategoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(selectedCategoryId || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Update selected category when prop changes
  useEffect(() => {
    setSelectedCategory(selectedCategoryId || '');
  }, [selectedCategoryId]);

  // Filter categories based on context
  const availableCategories = filterEditable
    ? categories.filter(category => category.isEditable)
    : categories.filter(category => category.level >= 2); // For story assignment, show level 2+ categories (subcategories)

  // Filter categories based on search query
  const filteredCategories = availableCategories.filter(category => {
    if (!searchQuery.trim()) return true;

    const breadcrumb = getCategoryBreadcrumb(category).toLowerCase();
    const searchLower = searchQuery.toLowerCase();

    return breadcrumb.includes(searchLower);
  });

  const handleCategorySelect = (categoryId: string) => {
    // Always set the selected category (radio button behavior)
    setSelectedCategory(categoryId);
  };

  const handleConfirm = () => {
    if (selectedCategory) {
      onConfirm(selectedCategory);
      onClose();
    }
  };

  const selectedCategoryData = availableCategories.find(c => c.id === selectedCategory);

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
                Select Category
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
                Choose the most appropriate category for this story. {filterEditable ? 'Only editable subcategories are shown.' : 'Select from available subcategories.'}
              </Text>

              {/* Search Bar */}
              <InputGroup>
                <MagnifyingGlassIcon 
                  className="h-5 w-5 text-zinc-400" 
                  data-slot="icon" 
                />
                <Input
                  type="search"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>

              {filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FolderIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <Text>
                    {searchQuery ? 'No categories found matching your search' : 'No categories available'}
                  </Text>
                  {searchQuery && (
                    <Text className="text-sm">Try a different search term</Text>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {filteredCategories.map((category) => (
                    <label 
                      key={category.id} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200 hover:border-kelly-green/30"
                    >
                      <Checkbox
                        checked={selectedCategory === category.id}
                        onChange={() => handleCategorySelect(category.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Text className="font-medium">{getCategoryBreadcrumb(category)}</Text>
                          <Badge color="zinc">
                            Level {category.level}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <span>{category._count?.stories || 0} stories</span>
                          </div>
                          {category._count?.children > 0 && (
                            <div className="flex items-center gap-1">
                              <FolderIcon className="h-3 w-3" />
                              <span>{category._count.children} subcategories</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedCategoryData && (
                <div className="bg-kelly-green/10 p-3 rounded-lg border border-kelly-green/20">
                  <Text className="text-sm text-kelly-green/80">
                    <strong>Selected:</strong> {getCategoryBreadcrumb(selectedCategoryData)}
                  </Text>
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
                disabled={!selectedCategory || isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Category'}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 