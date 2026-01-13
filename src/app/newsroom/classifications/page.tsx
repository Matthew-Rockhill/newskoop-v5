'use client';

import { useState, useMemo } from 'react';
import {
  LanguageIcon,
  MapPinIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Input, InputGroup } from '@/components/ui/input';
import { ClassificationType } from '@prisma/client';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataList, type DataListColumn, type RowAction } from '@/components/ui/data-list';
import { getClassificationTypeColor } from '@/lib/color-system';

import {
  useClassifications,
  useCreateClassification,
  useUpdateClassification,
  useDeleteClassification,
  Classification
} from '@/hooks/use-classifications';
import { useSession } from 'next-auth/react';

// Modal for creating/editing classifications
function ClassificationModal({
  isOpen,
  onClose,
  classification,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  classification?: Classification | null;
  type: ClassificationType;
}) {
  const [name, setName] = useState(classification?.name || '');
  const [nameAfrikaans, setNameAfrikaans] = useState(classification?.nameAfrikaans || '');
  const [descriptionAfrikaans, setDescriptionAfrikaans] = useState(classification?.descriptionAfrikaans || '');
  const [isActive, setIsActive] = useState(classification?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateClassification();
  const updateMutation = useUpdateClassification();

  const isEditing = !!classification;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: classification.id,
          data: {
            name,
            nameAfrikaans: nameAfrikaans || undefined,
            descriptionAfrikaans: descriptionAfrikaans || undefined,
            isActive,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name,
          nameAfrikaans: nameAfrikaans || undefined,
          descriptionAfrikaans: descriptionAfrikaans || undefined,
          type,
          isActive,
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
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">
              {isEditing ? 'Edit' : 'Add'} {getTypeName(type)}
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
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Name (English) *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-kelly-green focus:border-kelly-green"
                placeholder={`Enter ${getTypeName(type).toLowerCase()} name`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Name (Afrikaans)
              </label>
              <input
                type="text"
                value={nameAfrikaans}
                onChange={(e) => setNameAfrikaans(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-kelly-green focus:border-kelly-green"
                placeholder="Enter Afrikaans name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Description (Afrikaans)
              </label>
              <textarea
                value={descriptionAfrikaans}
                onChange={(e) => setDescriptionAfrikaans(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-kelly-green focus:border-kelly-green"
                placeholder="Enter Afrikaans description"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-kelly-green rounded border-zinc-300 focus:ring-kelly-green"
              />
              <label htmlFor="isActive" className="text-sm text-zinc-700">
                Active (available for selection)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" onClick={onClose} color="white">
                Cancel
              </Button>
              <Button type="submit" color="primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Delete confirmation modal
function DeleteModal({
  isOpen,
  onClose,
  classification,
}: {
  isOpen: boolean;
  onClose: () => void;
  classification: Classification | null;
}) {
  const deleteMutation = useDeleteClassification();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!classification) return;
    setError(null);

    try {
      await deleteMutation.mutateAsync(classification.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (!isOpen || !classification) return null;

  const totalUsage =
    classification._count.stories +
    classification._count.allowedByStations;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
            Delete Classification
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {totalUsage > 0 ? (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm font-medium mb-2">
                Cannot delete: This classification is in use
              </p>
              <ul className="text-amber-700 text-sm space-y-1">
                {classification._count.stories > 0 && (
                  <li>• {classification._count.stories} stories</li>
                )}
                {classification._count.allowedByStations > 0 && (
                  <li>• {classification._count.allowedByStations} stations</li>
                )}
              </ul>
            </div>
          ) : (
            <p className="text-zinc-600 mb-4">
              Are you sure you want to delete <strong>{classification.name}</strong>?
              This action cannot be undone.
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button onClick={onClose} color="white">
              Cancel
            </Button>
            {totalUsage === 0 && (
              <Button
                onClick={handleDelete}
                color="red"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTypeName(type: ClassificationType): string {
  switch (type) {
    case 'LANGUAGE':
      return 'Language';
    case 'RELIGION':
      return 'Religion';
    case 'LOCALITY':
      return 'Locality';
    default:
      return 'Classification';
  }
}

function getTypeIcon(type: ClassificationType) {
  switch (type) {
    case 'LANGUAGE':
      return LanguageIcon;
    case 'LOCALITY':
      return MapPinIcon;
    default:
      return DocumentTextIcon;
  }
}

export default function ClassificationsPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<ClassificationType>('LANGUAGE');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState<Classification | null>(null);

  const { data, isLoading, error } = useClassifications(activeType);
  const classifications = data?.classifications || [];

  // Filter classifications based on search
  const filteredClassifications = useMemo(() => {
    return classifications.filter((c: Classification) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nameAfrikaans && c.nameAfrikaans.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [classifications, searchQuery]);

  // Check if user can manage classifications (EDITOR+)
  const canManage = () => {
    const userRole = session?.user?.staffRole;
    return userRole && ['SUPERADMIN', 'ADMIN', 'EDITOR'].includes(userRole);
  };

  const handleCreate = () => {
    setSelectedClassification(null);
    setModalOpen(true);
  };

  const handleEdit = (classification: Classification) => {
    setSelectedClassification(classification);
    setModalOpen(true);
  };

  const handleDelete = (classification: Classification) => {
    setSelectedClassification(classification);
    setDeleteModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const TypeIcon = getTypeIcon(activeType);

  // Helper to check if classification can be deleted
  const canDelete = (classification: Classification) => {
    const totalUsage =
      classification._count.stories +
      classification._count.allowedByStations;
    return totalUsage === 0;
  };

  // Define columns for the DataList
  const columns: DataListColumn<Classification>[] = useMemo(() => [
    {
      key: 'classification',
      header: 'Classification',
      priority: 1,
      width: 'expand',
      render: (classification) => {
        const typeColors: Record<string, { bg: string; icon: string }> = {
          LANGUAGE: { bg: '#dbeafe', icon: '#2563eb' },
          RELIGION: { bg: '#f3e8ff', icon: '#9333ea' },
          LOCALITY: { bg: '#fef3c7', icon: '#d97706' },
        };
        const colors = typeColors[classification.type] || { bg: '#f4f4f5', icon: '#71717a' };
        return (
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.bg }}
            >
              <TypeIcon
                className="h-6 w-6"
                style={{ color: colors.icon }}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-zinc-900 dark:text-white truncate">
                {classification.name}
                {classification.nameAfrikaans && (
                  <span className="text-zinc-500 font-normal"> / {classification.nameAfrikaans}</span>
                )}
              </div>
              {!classification.isActive && (
                <Badge color="zinc" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
              <Badge color={getClassificationTypeColor(classification.type)}>
                {getTypeName(classification.type)}
              </Badge>
              <span>Created {formatDate(classification.createdAt)}</span>
            </div>
          </div>
        </div>
      );
      },
      mobileRender: (classification) => {
        const typeColors: Record<string, { bg: string; icon: string }> = {
          LANGUAGE: { bg: '#dbeafe', icon: '#2563eb' },
          RELIGION: { bg: '#f3e8ff', icon: '#9333ea' },
          LOCALITY: { bg: '#fef3c7', icon: '#d97706' },
        };
        const colors = typeColors[classification.type] || { bg: '#f4f4f5', icon: '#71717a' };
        return (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.bg }}
            >
              <TypeIcon
                className="h-5 w-5"
                style={{ color: colors.icon }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-900 dark:text-white truncate">
                {classification.name}
              </div>
              {classification.nameAfrikaans && (
                <div className="text-sm text-zinc-500 truncate">{classification.nameAfrikaans}</div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <Badge color={getClassificationTypeColor(classification.type)}>
              {getTypeName(classification.type)}
            </Badge>
            <div className="flex items-center gap-2.5">
              <DocumentTextIcon className="h-3.5 w-3.5" />
              {classification._count.stories} stories
            </div>
            {!classification.isActive && (
              <Badge color="zinc" className="text-xs">Inactive</Badge>
            )}
          </div>
        </div>
      );
      },
    },
    {
      key: 'usage',
      header: 'Usage',
      priority: 2,
      width: 'shrink',
      render: (classification) => (
        <div className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <DocumentTextIcon className="h-4 w-4 flex-shrink-0" />
            <span>{classification._count.stories} stories</span>
          </div>
          {classification._count.allowedByStations > 0 && (
            <div className="text-xs text-zinc-400">
              {classification._count.allowedByStations} stations
            </div>
          )}
        </div>
      ),
    },
  ], [activeType]);

  // Define row actions
  const rowActions: RowAction<Classification>[] = useMemo(() => [
    {
      key: 'edit',
      label: 'Edit',
      icon: PencilIcon,
      onAction: handleEdit,
      isHidden: () => !canManage(),
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: TrashIcon,
      destructive: true,
      onAction: handleDelete,
      isHidden: () => !canManage(),
      isDisabled: (classification) => !canDelete(classification),
    },
  ], [session?.user?.staffRole]);

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Classifications"
          action={
            canManage() ? {
              label: `New ${getTypeName(activeType)}`,
              onClick: handleCreate
            } : undefined
          }
        />

        <p className="text-sm text-zinc-500">
          Classifications are used for content filtering by language, religion, and locality. Radio stations can filter content based on these classifications.
        </p>

        {/* Search and Type Filters - Same row on desktop */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search - Left */}
          <div className="w-full sm:max-w-xs">
            <InputGroup>
              <MagnifyingGlassIcon data-slot="icon" />
              <Input
                type="search"
                placeholder="Search classifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search classifications"
              />
            </InputGroup>
          </div>

          {/* Type Filter Tabs - Right */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setActiveType('LANGUAGE')}
              color={activeType === 'LANGUAGE' ? 'primary' : 'white'}
              className="text-sm"
            >
              <LanguageIcon className="h-4 w-4" />
              Languages
            </Button>
            <Button
              onClick={() => setActiveType('RELIGION')}
              color={activeType === 'RELIGION' ? 'primary' : 'white'}
              className="text-sm"
            >
              <DocumentTextIcon className="h-4 w-4" />
              Religions
            </Button>
            <Button
              onClick={() => setActiveType('LOCALITY')}
              color={activeType === 'LOCALITY' ? 'primary' : 'white'}
              className="text-sm"
            >
              <MapPinIcon className="h-4 w-4" />
              Localities
            </Button>
          </div>
        </div>

        <DataList<Classification>
          items={filteredClassifications}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          variant="table"
          columns={columns}
          striped
          rowActions={rowActions}
          onRowClick={(classification) => canManage() && handleEdit(classification)}
          emptyState={{
            icon: TypeIcon,
            title: `No ${getTypeName(activeType).toLowerCase()} classifications found`,
            description: `Get started by adding your first ${getTypeName(activeType).toLowerCase()} classification.`,
            action: canManage() ? {
              label: `New ${getTypeName(activeType)}`,
              onClick: handleCreate,
            } : undefined,
          }}
          ariaLabel="Classifications list"
        />
      </div>

      {/* Create/Edit Modal */}
      <ClassificationModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedClassification(null);
        }}
        classification={selectedClassification}
        type={activeType}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedClassification(null);
        }}
        classification={selectedClassification}
      />
    </Container>
  );
}
