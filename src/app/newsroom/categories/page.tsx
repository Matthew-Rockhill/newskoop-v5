'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TagIcon,
  FolderIcon,
  DocumentTextIcon,
  PencilIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Input, InputGroup } from '@/components/ui/input';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { DataList, type DataListColumn, type RowAction } from '@/components/ui/data-list';
import { getCategoryLevelColor } from '@/lib/color-system';

import { useCategories } from '@/hooks/use-categories';
import { useSession } from 'next-auth/react';
import { Category } from '@/types';

export default function CategoriesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  // Use flat data for better search performance
  const { data, isLoading, error } = useCategories(
    true, // Always use flat=true for consistent search
    undefined,
    searchQuery || undefined // Pass search query to API
  );
  const categories = data?.categories || [];

  // Check if user can create categories
  const canCreateCategory = () => {
    const userRole = session?.user?.staffRole;
    return userRole && ['SUPERADMIN', 'ADMIN', 'EDITOR', 'SUB_EDITOR'].includes(userRole);
  };

  // Check if user can edit a specific category
  const canEditCategory = useCallback((category: Category) => {
    const userRole = session?.user?.staffRole;
    if (!userRole) return false;

    // SUPERADMIN, ADMIN, and EDITOR can edit all categories
    if (['SUPERADMIN', 'ADMIN', 'EDITOR'].includes(userRole)) return true;

    // SUB_EDITOR can edit level 2 and 3 categories
    if (userRole === 'SUB_EDITOR') {
      return category.level > 1;
    }

    return false;
  }, [session?.user?.staffRole]);

  // Define columns for the DataList
  const columns: DataListColumn<Category>[] = useMemo(() => [
    {
      key: 'category',
      header: 'Category',
      priority: 1,
      width: 'expand',
      render: (category) => {
        const indentLevel = category.level - 1;

        return (
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                {category.isParent ? (
                  <FolderIcon className="h-6 w-6 text-blue-500" />
                ) : (
                  <TagIcon className="h-6 w-6 text-zinc-500" />
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2" style={{ marginLeft: `${indentLevel * 16}px` }}>
                <div className="font-medium text-zinc-900 dark:text-white truncate">
                  {category.name}
                  {category.nameAfrikaans && (
                    <span className="text-zinc-500 font-normal"> / {category.nameAfrikaans}</span>
                  )}
                </div>
                <Badge
                  color={getCategoryLevelColor(category.level)}
                  className="text-xs"
                >
                  Level {category.level}
                </Badge>
                {!canEditCategory(category) && (
                  <Badge color="red" className="text-xs">
                    Protected
                  </Badge>
                )}
              </div>
              <div
                className="text-sm text-zinc-600 dark:text-zinc-400 truncate"
                style={{ marginLeft: `${indentLevel * 16}px` }}
              >
                {category.description || 'No description'}
              </div>
              <div
                className="flex items-center gap-4 mt-1 text-xs text-zinc-500"
                style={{ marginLeft: `${indentLevel * 16}px` }}
              >
                <div className="flex items-center gap-1.5">
                  <DocumentTextIcon className="h-3.5 w-3.5" />
                  {category._count?.stories || 0} stories
                </div>
                {(category._count?.children || 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <FolderIcon className="h-3.5 w-3.5" />
                    {category._count?.children || 0} subcategories
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      },
      mobileRender: (category) => (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
              {category.isParent ? (
                <FolderIcon className="h-5 w-5 text-blue-500" />
              ) : (
                <TagIcon className="h-5 w-5 text-zinc-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-900 dark:text-white truncate">
                {category.name}
              </div>
              {category.nameAfrikaans && (
                <div className="text-sm text-zinc-500 truncate">{category.nameAfrikaans}</div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <Badge
              color={getCategoryLevelColor(category.level)}
              className="text-xs"
            >
              Level {category.level}
            </Badge>
            <div className="flex items-center gap-1.5">
              <DocumentTextIcon className="h-3.5 w-3.5" />
              {category._count?.stories || 0} stories
            </div>
            {!canEditCategory(category) && (
              <Badge color="red" className="text-xs">Protected</Badge>
            )}
          </div>
        </div>
      ),
    },
  ], [canEditCategory]);

  // Define row actions
  const rowActions: RowAction<Category>[] = useMemo(() => [
    {
      key: 'edit',
      label: 'Edit',
      icon: PencilIcon,
      href: (category) => `/newsroom/categories/${category.id}/edit`,
      onAction: () => {},
      isHidden: (category) => !canEditCategory(category),
    },
  ], [canEditCategory]);

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Categories"
          action={
            canCreateCategory() ? {
              label: "New Category",
              onClick: () => router.push('/newsroom/categories/new')
            } : undefined
          }
        />

        {/* Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <InputGroup>
              <MagnifyingGlassIcon data-slot="icon" />
              <Input
                type="search"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search categories"
              />
            </InputGroup>
          </div>
        </div>

        <DataList<Category>
          items={categories}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          variant="table"
          columns={columns}
          striped
          rowActions={rowActions}
          onRowClick={(category) => canEditCategory(category) && router.push(`/newsroom/categories/${category.id}/edit`)}
          getRowHref={(category) => canEditCategory(category) ? `/newsroom/categories/${category.id}/edit` : undefined}
          emptyState={{
            icon: TagIcon,
            title: "No categories found",
            description: "Get started by creating your first category.",
            action: canCreateCategory() ? {
              label: "New Category",
              onClick: () => router.push('/newsroom/categories/new'),
            } : undefined,
          }}
          ariaLabel="Categories list"
        />
      </div>
    </Container>
  );
}
