'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Bars3BottomLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  LinkIcon,
  FolderIcon,
  MinusIcon,
  Bars2Icon,
} from '@heroicons/react/24/outline';
import { MenuItemType } from '@prisma/client';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

import {
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useReorderMenuItems,
  MenuItem,
} from '@/hooks/use-menu';
import { useCategories } from '@/hooks/use-categories';
import { useSession } from 'next-auth/react';

// Sortable menu item component
function SortableMenuItem({
  item,
  level = 0,
  expandedItems,
  toggleExpand,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  item: MenuItem;
  level?: number;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onToggleVisibility: (item: MenuItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);

  const getTypeIcon = () => {
    switch (item.type) {
      case 'CATEGORY':
        return <FolderIcon className="h-4 w-4 text-blue-500" />;
      case 'CUSTOM_LINK':
        return <LinkIcon className="h-4 w-4 text-purple-500" />;
      case 'DIVIDER':
        return <MinusIcon className="h-4 w-4 text-zinc-400" />;
      default:
        return <Bars3BottomLeftIcon className="h-4 w-4" />;
    }
  };

  const getTypeBadge = () => {
    switch (item.type) {
      case 'CATEGORY':
        return <Badge color="blue">Category</Badge>;
      case 'CUSTOM_LINK':
        return <Badge color="purple">Custom Link</Badge>;
      case 'DIVIDER':
        return <Badge color="zinc">Divider</Badge>;
      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`flex items-center gap-2 p-3 bg-white border rounded-lg mb-2 ${
          !item.isVisible ? 'opacity-50' : ''
        } ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-zinc-100 rounded"
        >
          <Bars2Icon className="h-4 w-4 text-zinc-400" />
        </button>

        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(item.id)}
            className="p-1 hover:bg-zinc-100 rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Type Icon */}
        {getTypeIcon()}

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 truncate">
              {item.type === 'DIVIDER' ? '--- Divider ---' : item.label}
            </span>
            {item.labelAfrikaans && item.type !== 'DIVIDER' && (
              <span className="text-zinc-500 text-sm">/ {item.labelAfrikaans}</span>
            )}
          </div>
          {item.type === 'CATEGORY' && item.category && (
            <div className="text-xs text-zinc-500">
              Links to: {item.category.name}
            </div>
          )}
          {item.type === 'CUSTOM_LINK' && item.url && (
            <div className="text-xs text-zinc-500 truncate">
              URL: {item.url}
            </div>
          )}
        </div>

        {/* Type Badge */}
        {getTypeBadge()}

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleVisibility(item)}
            className="p-1.5 hover:bg-zinc-100 rounded"
            title={item.isVisible ? 'Hide' : 'Show'}
          >
            {item.isVisible ? (
              <EyeIcon className="h-4 w-4 text-zinc-600" />
            ) : (
              <EyeSlashIcon className="h-4 w-4 text-zinc-400" />
            )}
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 hover:bg-zinc-100 rounded"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4 text-zinc-600" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1.5 hover:bg-red-50 rounded"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {item.children!.map((child) => (
            <SortableMenuItem
              key={child.id}
              item={child}
              level={level + 1}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleVisibility={onToggleVisibility}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Create/Edit Modal
function MenuItemModal({
  isOpen,
  onClose,
  menuItem,
  parentId,
  menuItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  menuItem?: MenuItem | null;
  parentId?: string | null;
  menuItems: MenuItem[];
}) {
  const [label, setLabel] = useState('');
  const [labelAfrikaans, setLabelAfrikaans] = useState('');
  const [type, setType] = useState<MenuItemType>('CATEGORY');
  const [categoryId, setCategoryId] = useState('');
  const [url, setUrl] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);
  const [icon, setIcon] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: categoriesData } = useCategories(true); // flat list
  const categories = categoriesData?.categories || [];

  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();

  const isEditing = !!menuItem;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Reset form when modal opens/closes or menuItem changes
  useEffect(() => {
    if (menuItem) {
      setLabel(menuItem.label);
      setLabelAfrikaans(menuItem.labelAfrikaans || '');
      setType(menuItem.type);
      setCategoryId(menuItem.categoryId || '');
      setUrl(menuItem.url || '');
      setOpenInNewTab(menuItem.openInNewTab);
      setSelectedParentId(menuItem.parentId || '');
      setIsVisible(menuItem.isVisible);
      setIcon(menuItem.icon || '');
    } else {
      setLabel('');
      setLabelAfrikaans('');
      setType('CATEGORY');
      setCategoryId('');
      setUrl('');
      setOpenInNewTab(false);
      setSelectedParentId(parentId || '');
      setIsVisible(true);
      setIcon('');
    }
    setError(null);
  }, [menuItem, parentId, isOpen]);

  // Flatten menu items for parent selection
  const flattenItems = (items: MenuItem[], level = 0): { item: MenuItem; level: number }[] => {
    const result: { item: MenuItem; level: number }[] = [];
    for (const item of items) {
      // Don't allow selecting self or descendants as parent
      if (!menuItem || item.id !== menuItem.id) {
        result.push({ item, level });
        if (item.children) {
          result.push(...flattenItems(item.children, level + 1));
        }
      }
    }
    return result;
  };

  const flatMenuItems = flattenItems(menuItems);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: menuItem.id,
          data: {
            label,
            labelAfrikaans: labelAfrikaans || null,
            type,
            isVisible,
            icon: icon || null,
            parentId: selectedParentId || null,
            categoryId: type === 'CATEGORY' ? (categoryId || null) : null,
            url: type === 'CUSTOM_LINK' ? (url || null) : null,
            openInNewTab: type === 'CUSTOM_LINK' ? openInNewTab : undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          label,
          labelAfrikaans: labelAfrikaans || undefined,
          type,
          isVisible,
          icon: icon || undefined,
          parentId: selectedParentId || undefined,
          categoryId: type === 'CATEGORY' ? (categoryId || undefined) : undefined,
          url: type === 'CUSTOM_LINK' ? (url || undefined) : undefined,
          openInNewTab: type === 'CUSTOM_LINK' ? openInNewTab : undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">
              {isEditing ? 'Edit Menu Item' : 'Add Menu Item'}
            </h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('CATEGORY')}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    type === 'CATEGORY'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <FolderIcon className="h-4 w-4 inline mr-1" />
                  Category Link
                </button>
                <button
                  type="button"
                  onClick={() => setType('CUSTOM_LINK')}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    type === 'CUSTOM_LINK'
                      ? 'bg-purple-50 border-purple-500 text-purple-700'
                      : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <LinkIcon className="h-4 w-4 inline mr-1" />
                  Custom Link
                </button>
                <button
                  type="button"
                  onClick={() => setType('DIVIDER')}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    type === 'DIVIDER'
                      ? 'bg-zinc-100 border-zinc-500 text-zinc-700'
                      : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <MinusIcon className="h-4 w-4 inline mr-1" />
                  Divider
                </button>
              </div>
            </div>

            {type !== 'DIVIDER' && (
              <>
                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Label (English) *
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-kelly-green focus:border-kelly-green"
                    placeholder="Menu item label"
                  />
                </div>

                {/* Label Afrikaans */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Label (Afrikaans)
                  </label>
                  <input
                    type="text"
                    value={labelAfrikaans}
                    onChange={(e) => setLabelAfrikaans(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-kelly-green focus:border-kelly-green"
                    placeholder="Afrikaans label"
                  />
                </div>
              </>
            )}

            {/* Category Selection */}
            {type === 'CATEGORY' && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-kelly-green focus:border-kelly-green"
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat: { id: string; name: string; level: number }) => (
                    <option key={cat.id} value={cat.id}>
                      {'─'.repeat(cat.level - 1)} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom URL */}
            {type === 'CUSTOM_LINK' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-kelly-green focus:border-kelly-green"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="openInNewTab"
                    checked={openInNewTab}
                    onChange={(e) => setOpenInNewTab(e.target.checked)}
                    className="h-4 w-4 text-kelly-green rounded border-zinc-300 focus:ring-kelly-green"
                  />
                  <label htmlFor="openInNewTab" className="text-sm text-zinc-700">
                    Open in new tab
                  </label>
                </div>
              </>
            )}

            {/* Parent Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Parent Menu Item
              </label>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-kelly-green focus:border-kelly-green"
              >
                <option value="">None (Top Level)</option>
                {flatMenuItems.map(({ item, level }) => (
                  <option key={item.id} value={item.id}>
                    {'─'.repeat(level)} {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVisible"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                className="h-4 w-4 text-kelly-green rounded border-zinc-300 focus:ring-kelly-green"
              />
              <label htmlFor="isVisible" className="text-sm text-zinc-700">
                Visible in navigation
              </label>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" onClick={onClose} color="white">
                Cancel
              </Button>
              <Button type="submit" color="primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Item'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteModal({
  isOpen,
  onClose,
  menuItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItem | null;
}) {
  const deleteMutation = useDeleteMenuItem();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!menuItem) return;
    setError(null);

    try {
      await deleteMutation.mutateAsync(menuItem.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (!isOpen || !menuItem) return null;

  const hasChildren = menuItem.children && menuItem.children.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
            Delete Menu Item
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <p className="text-zinc-600 mb-4">
            Are you sure you want to delete <strong>{menuItem.label}</strong>?
            {hasChildren && (
              <span className="block mt-2 text-amber-600 font-medium">
                Warning: This will also delete {menuItem.children!.length} child item(s).
              </span>
            )}
          </p>

          <div className="flex justify-end gap-3">
            <Button onClick={onClose} color="white">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              color="red"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MenuBuilderPage() {
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);

  const { data, isLoading, error } = useMenuItems(false); // tree structure
  const updateMutation = useUpdateMenuItem();
  const reorderMutation = useReorderMenuItems();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync items when data changes
  useEffect(() => {
    if (data?.menuItems) {
      setItems(data.menuItems);
      // Expand all by default
      const allIds = new Set<string>();
      const collectIds = (items: MenuItem[]) => {
        items.forEach((item) => {
          allIds.add(item.id);
          if (item.children) collectIds(item.children);
        });
      };
      collectIds(data.menuItems);
      setExpandedItems(allIds);
    }
  }, [data]);

  // Check if user can manage menu (EDITOR+)
  const canManage = () => {
    const userRole = session?.user?.staffRole;
    return userRole && ['SUPERADMIN', 'ADMIN', 'EDITOR'].includes(userRole);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCreate = () => {
    setSelectedMenuItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setModalOpen(true);
  };

  const handleDelete = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setDeleteModalOpen(true);
  };

  const handleToggleVisibility = async (item: MenuItem) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        data: { isVisible: !item.isVisible },
      });
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  // Flatten items for sortable context
  const flattenForSort = (items: MenuItem[]): string[] => {
    const result: string[] = [];
    const flatten = (items: MenuItem[]) => {
      items.forEach((item) => {
        result.push(item.id);
        if (item.children && expandedItems.has(item.id)) {
          flatten(item.children);
        }
      });
    };
    flatten(items);
    return result;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // For now, we'll implement simple same-level reordering
    // Full nested reordering would require more complex logic
    const activeId = active.id as string;
    const overId = over.id as string;

    // Find items in the flat list
    const flatIds = flattenForSort(items);
    const oldIndex = flatIds.indexOf(activeId);
    const newIndex = flatIds.indexOf(overId);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the flat list
    const newOrder = arrayMove(flatIds, oldIndex, newIndex);

    // Create reorder items with new sort orders
    const reorderItems = newOrder.map((id, index) => {
      // Find the original item to get its parentId
      const findItem = (items: MenuItem[]): MenuItem | null => {
        for (const item of items) {
          if (item.id === id) return item;
          if (item.children) {
            const found = findItem(item.children);
            if (found) return found;
          }
        }
        return null;
      };
      const item = findItem(items);
      return {
        id,
        parentId: item?.parentId || null,
        sortOrder: index,
      };
    });

    try {
      await reorderMutation.mutateAsync(reorderItems);
    } catch (err) {
      console.error('Failed to reorder:', err);
    }
  };

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">
            Error loading menu: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Menu Builder"
          action={
            canManage() ? {
              label: "New Menu Item",
              onClick: handleCreate
            } : undefined
          }
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Tip:</strong> Drag and drop items to reorder. Click the eye icon to toggle visibility.
          Changes are saved automatically.
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-zinc-100 rounded-lg h-16"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bars3BottomLeftIcon}
            title="No menu items"
            description="Get started by adding your first menu item."
            action={
              canManage() ? {
                label: "New Menu Item",
                onClick: handleCreate
              } : undefined
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={flattenForSort(items)}
              strategy={verticalListSortingStrategy}
            >
              <div className="bg-zinc-50 rounded-lg p-4 min-h-[200px]">
                {items.map((item) => (
                  <SortableMenuItem
                    key={item.id}
                    item={item}
                    expandedItems={expandedItems}
                    toggleExpand={toggleExpand}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Create/Edit Modal */}
      <MenuItemModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedMenuItem(null);
        }}
        menuItem={selectedMenuItem}
        menuItems={items}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedMenuItem(null);
        }}
        menuItem={selectedMenuItem}
      />
    </Container>
  );
}
