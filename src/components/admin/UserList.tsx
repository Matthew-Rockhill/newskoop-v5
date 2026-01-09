'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUsers, type UserWithStation } from '@/hooks/use-users';
import { DataList, type DataListColumn, type RowAction } from '@/components/ui/data-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { UsersIcon, UserIcon, BuildingOfficeIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Input, InputGroup } from '@/components/ui/input';

type UserFilter = 'all' | 'radio' | 'staff';

// Helper function for formatting user role
function formatUserRole(user: UserWithStation) {
  if (user.userType === 'STAFF') {
    return user.staffRole || 'Staff';
  }
  return user.radioStation?.name || 'Radio Station';
}

export function UserList() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<UserFilter>('all');

  const {
    users,
    pagination,
    isLoading,
    setFilters,
  } = useUsers({
    perPage: 10,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters((prev) => ({ ...prev, query, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Filter users based on selected user type
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (userTypeFilter === 'all') return true;
      if (userTypeFilter === 'radio') return user.userType === 'RADIO';
      if (userTypeFilter === 'staff') return user.userType === 'STAFF';
      return true;
    });
  }, [users, userTypeFilter]);

  // Define columns for the DataList
  const columns: DataListColumn<UserWithStation>[] = useMemo(() => [
    {
      key: 'user',
      header: 'User',
      priority: 1,
      width: 'expand',
      render: (user) => (
        <div className="flex items-center gap-4">
          <Avatar
            name={`${user.firstName} ${user.lastName}`}
            className="size-12"
          />
          <div>
            <div className="flex items-center gap-2">
              <div className="font-medium text-zinc-900 dark:text-white">
                {user.firstName} {user.lastName}
              </div>
              <Badge
                color={user.userType === 'STAFF' ? 'blue' : 'purple'}
                className="text-xs"
              >
                {user.userType === 'STAFF' ? (
                  <div className="flex items-center gap-1">
                    <UserIcon className="size-3" />
                    Staff
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <BuildingOfficeIcon className="size-3" />
                    Radio
                  </div>
                )}
              </Badge>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <a
                href={`mailto:${user.email}`}
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {user.email}
              </a>
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-500">
              {formatUserRole(user)}
            </div>
          </div>
        </div>
      ),
      mobileRender: (user) => (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Avatar
              name={`${user.firstName} ${user.lastName}`}
              className="size-10"
            />
            <div>
              <div className="font-medium text-zinc-900 dark:text-white">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-zinc-500">
                {formatUserRole(user)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              color={user.userType === 'STAFF' ? 'blue' : 'purple'}
              className="text-xs"
            >
              {user.userType === 'STAFF' ? 'Staff' : 'Radio'}
            </Badge>
            <Badge color={user.isActive ? 'lime' : 'zinc'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      priority: 2,
      width: 'shrink',
      align: 'center',
      render: (user) => (
        <Badge color={user.isActive ? 'lime' : 'zinc'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ], []);

  // Define row actions
  const rowActions: RowAction<UserWithStation>[] = useMemo(() => [
    {
      key: 'edit',
      label: 'Edit',
      icon: PencilIcon,
      href: (user) => `/admin/users/${user.id}/edit`,
      onAction: () => {}, // Required but unused when href is provided
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        action={{
          label: "New User",
          onClick: () => router.push('/admin/users/new')
        }}
      />

      {/* Search and Filters - Same row on desktop */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search - Left */}
        <div className="w-full sm:max-w-xs">
          <InputGroup>
            <MagnifyingGlassIcon data-slot="icon" />
            <Input
              type="search"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search users"
            />
          </InputGroup>
        </div>

        {/* User Type Filter - Right */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setUserTypeFilter('all')}
            aria-pressed={userTypeFilter === 'all'}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-colors duration-150
              ${userTypeFilter === 'all'
                ? 'bg-kelly-green text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }
            `}
          >
            All
          </button>
          <button
            onClick={() => setUserTypeFilter('radio')}
            aria-pressed={userTypeFilter === 'radio'}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-colors duration-150
              ${userTypeFilter === 'radio'
                ? 'bg-kelly-green text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }
            `}
          >
            <BuildingOfficeIcon className="h-4 w-4" />
            Radio
          </button>
          <button
            onClick={() => setUserTypeFilter('staff')}
            aria-pressed={userTypeFilter === 'staff'}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-colors duration-150
              ${userTypeFilter === 'staff'
                ? 'bg-kelly-green text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }
            `}
          >
            <UserIcon className="h-4 w-4" />
            Staff
          </button>
        </div>
      </div>

      <DataList<UserWithStation>
        items={filteredUsers}
        isLoading={isLoading}
        variant="table"
        columns={columns}
        striped
        rowActions={rowActions}
        onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
        pagination={pagination ? {
          page: pagination.page,
          pageSize: 10,
          total: pagination.total,
          onPageChange: handlePageChange,
        } : undefined}
        emptyState={{
          icon: UsersIcon,
          title: userTypeFilter === 'all' ? "No users" : `No ${userTypeFilter} users`,
          description: userTypeFilter === 'all'
            ? "Get started by creating a new user."
            : `No ${userTypeFilter} users found.`,
          action: userTypeFilter === 'all' ? {
            label: "New User",
            onClick: () => router.push('/admin/users/new'),
          } : undefined,
        }}
        ariaLabel="Users list"
      />
    </div>
  );
}
