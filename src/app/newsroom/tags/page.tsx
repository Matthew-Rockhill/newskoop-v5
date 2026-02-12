'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  TagIcon,
  DocumentTextIcon,
  PencilIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Input, InputGroup } from '@/components/ui/input';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { DataList, type DataListColumn, type RowAction } from '@/components/ui/data-list';

import { useTags, Tag } from '@/hooks/use-tags';
import { useSession } from 'next-auth/react';
import { hasTagPermission } from '@/lib/permissions';
import { StaffRole } from '@prisma/client';

export default function TagsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useTags();
  const tags = data?.tags || [];

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    return tags.filter((tag: Tag) => {
      return tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tag.nameAfrikaans && tag.nameAfrikaans.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [tags, searchQuery]);

  // Check if user can create tags
  const canCreateTag = () => {
    const userRole = session?.user?.staffRole as StaffRole | null;
    return hasTagPermission(userRole, 'create');
  };

  // Check if user can edit a specific tag
  const canEditTag = (tag: Tag) => {
    const userRole = session?.user?.staffRole as StaffRole | null;
    return hasTagPermission(userRole, 'update');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Define columns for the DataList
  const columns: DataListColumn<Tag>[] = useMemo(() => [
    {
      key: 'tag',
      header: 'Tag',
      priority: 1,
      width: 'expand',
      render: (tag) => (
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full flex items-center justify-center bg-zinc-100">
              <TagIcon className="h-6 w-6 text-zinc-500" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-zinc-900 dark:text-white truncate">
                {tag.name}
                {tag.nameAfrikaans && (
                  <span className="text-zinc-500 font-normal"> / {tag.nameAfrikaans}</span>
                )}
              </div>
              {!canEditTag(tag) && (
                <Badge color="red" className="text-xs">
                  Protected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <DocumentTextIcon className="h-3.5 w-3.5" />
                {tag._count?.stories || 0} stories
              </div>
              <span>Created {formatDate(tag.createdAt)}</span>
            </div>
          </div>
        </div>
      ),
      mobileRender: (tag) => (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-zinc-100">
              <TagIcon className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-900 dark:text-white truncate">
                {tag.name}
              </div>
              {tag.nameAfrikaans && (
                <div className="text-sm text-zinc-500 truncate">{tag.nameAfrikaans}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <DocumentTextIcon className="h-3.5 w-3.5" />
              {tag._count?.stories || 0} stories
            </div>
            {!canEditTag(tag) && (
              <Badge color="red" className="text-xs">Protected</Badge>
            )}
          </div>
        </div>
      ),
    },
  ], [session?.user?.staffRole]);

  // Define row actions
  const rowActions: RowAction<Tag>[] = useMemo(() => [
    {
      key: 'edit',
      label: 'Edit',
      icon: PencilIcon,
      href: (tag) => `/newsroom/tags/${tag.id}/edit`,
      onAction: () => {},
      isHidden: (tag) => !canEditTag(tag),
    },
  ], [session?.user?.staffRole]);

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Tags"
          action={
            canCreateTag() ? {
              label: "New Tag",
              onClick: () => router.push('/newsroom/tags/new')
            } : undefined
          }
        />

        <p className="text-sm text-zinc-500">
          Tags are topical labels that can be applied to stories. For language, religion, and locality filtering, use Classifications.
        </p>

        {/* Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <InputGroup>
              <MagnifyingGlassIcon data-slot="icon" />
              <Input
                type="search"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search tags"
              />
            </InputGroup>
          </div>
        </div>

        <DataList<Tag>
          items={filteredTags}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          variant="table"
          columns={columns}
          striped
          rowActions={rowActions}
          onRowClick={(tag) => canEditTag(tag) && router.push(`/newsroom/tags/${tag.id}/edit`)}
          getRowHref={(tag) => canEditTag(tag) ? `/newsroom/tags/${tag.id}/edit` : undefined}
          emptyState={{
            icon: TagIcon,
            title: "No tags found",
            description: "Get started by creating your first tag to organize stories by topic.",
            action: canCreateTag() ? {
              label: "New Tag",
              onClick: () => router.push('/newsroom/tags/new'),
            } : undefined,
          }}
          ariaLabel="Tags list"
        />
      </div>
    </Container>
  );
}
