'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TagIcon,
  FolderIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

import { useCategories } from '@/hooks/use-categories';
import { useSession } from 'next-auth/react';

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

  // Check if user can create categories (SUPERADMIN can create parent categories, ADMIN/EDITOR can create subcategories)
  const canCreateCategory = () => {
    const userRole = session?.user?.staffRole;
    return userRole && ['SUPERADMIN', 'ADMIN', 'EDITOR'].includes(userRole);
  };

  // Check if user can edit a specific category
  const canEditCategory = (category: Category) => {
    const userRole = session?.user?.staffRole;
    if (!userRole) return false;
    
    // SUPERADMIN can edit everything
    if (userRole === 'SUPERADMIN') return true;
    
    // ADMIN and EDITOR can only edit subcategories (level > 1)
    if (['ADMIN', 'EDITOR'].includes(userRole)) {
      return category.level > 1;
    }
    
    return false;
  };

  const renderCategoryRow = (category: Category) => {
    // Calculate indentation based on level
    const indentLevel = category.level - 1;
    
    return (
      <tr
        key={category.id}
        onClick={() => canEditCategory(category) && router.push(`/admin/newsroom/categories/${category.id}/edit`)}
        className={`${canEditCategory(category) ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} focus:outline-none border-b border-gray-100 last:border-b-0`}
      >
        <td className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              {category.isParent ? (
                  <FolderIcon className="h-6 w-6 text-blue-500" />
              ) : (
                  <TagIcon className="h-6 w-6 text-gray-500" />
              )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2" style={{ marginLeft: `${indentLevel * 16}px` }}>
                <div className="font-medium text-gray-900 truncate">
                  {category.name}
          </div>
          <Badge 
                  color={category.level === 1 ? 'blue' : category.level === 2 ? 'purple' : 'zinc'} 
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
              <div className="text-sm text-gray-600 truncate" style={{ marginLeft: `${indentLevel * 16}px` }}>
                {category.description || 'No description'}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500" style={{ marginLeft: `${indentLevel * 16}px` }}>
                <div className="flex items-center gap-1">
                  <DocumentTextIcon className="h-3 w-3" />
            {category._count?.stories || 0} stories
                </div>
                {category._count?.children > 0 && (
                  <div className="flex items-center gap-1">
                    <FolderIcon className="h-3 w-3" />
                    {category._count.children} subcategories
                  </div>
                )}
              </div>
            </div>
          </div>
        </td>

        <td className="py-4">
          {canEditCategory(category) ? (
          <Button
              onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              router.push(`/admin/newsroom/categories/${category.id}/edit`);
            }}
              outline
              className="text-sm"
          >
              Edit
          </Button>
          ) : (
            <span className="text-sm text-gray-400">Protected</span>
          )}
        </td>
      </tr>
    );
  };

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading categories: {error.message}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
      <PageHeader
        title="Categories"
          searchProps={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search categories..."
          }}
          action={
            canCreateCategory() ? {
              label: "New Category",
              onClick: () => router.push('/admin/newsroom/categories/new')
            } : undefined
          }
        />

      {isLoading ? (
        <div className="text-center py-12">
          <p>Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title="No categories found"
          description="Get started by creating your first category."
          action={
              canCreateCategory() ? {
                label: "New Category",
                onClick: () => router.push('/admin/newsroom/categories/new')
              } : undefined
          }
        />
      ) : (
          <Table striped>
            <thead>
              <tr>
                <th className="w-4/5">Category</th>
                <th className="w-1/5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => renderCategoryRow(category))}
            </tbody>
          </Table>
        )}
        </div>
    </Container>
  );
} 