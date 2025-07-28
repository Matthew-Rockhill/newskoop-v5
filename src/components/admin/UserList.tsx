'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUsers } from '@/hooks/use-users';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';
import { UsersIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

// Define types locally to match the database schema
type UserType = 'STAFF' | 'RADIO';
type StaffRole = 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'SUB_EDITOR' | 'JOURNALIST' | 'INTERN';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserType;
  staffRole?: StaffRole | null;
  isActive: boolean;
  radioStation?: { name: string } | null;
  createdAt: string;
}

type UserFilter = 'all' | 'radio' | 'staff';

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

  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const formatUserRole = (userType: UserType, staffRole?: StaffRole | null, radioStation?: { name: string } | null) => {
    if (userType === 'STAFF') {
      return staffRole || 'Staff';
    }
    return radioStation?.name || 'Radio Station';
  };

  // Filter users based on selected user type
  const filteredUsers = users.filter((user) => {
    if (userTypeFilter === 'all') return true;
    if (userTypeFilter === 'radio') return user.userType === 'RADIO';
    if (userTypeFilter === 'staff') return user.userType === 'STAFF';
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        searchProps={{
          value: searchQuery,
          onChange: handleSearch,
          placeholder: "Search users..."
        }}
        action={{
          label: "Create",
          onClick: () => router.push('/admin/users/new')
        }}
      />

      {/* User Type Filter Toggle */}
      <div className="flex gap-2">
        <Button
          onClick={() => setUserTypeFilter('all')}
          color={userTypeFilter === 'all' ? 'primary' : 'white'}
          className="text-sm"
        >
          <UsersIcon className="size-4" />
          All Users
        </Button>
        <Button
          onClick={() => setUserTypeFilter('radio')}
          color={userTypeFilter === 'radio' ? 'primary' : 'white'}
          className="text-sm"
        >
          <BuildingOfficeIcon className="size-4" />
          Radio Users
        </Button>
        <Button
          onClick={() => setUserTypeFilter('staff')}
          color={userTypeFilter === 'staff' ? 'primary' : 'white'}
          className="text-sm"
        >
          <UserIcon className="size-4" />
          Staff Users
        </Button>
      </div>

      {!isLoading && filteredUsers.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={userTypeFilter === 'all' ? "No users" : `No ${userTypeFilter} users`}
          description={userTypeFilter === 'all' ? "Get started by creating a new user." : `No ${userTypeFilter} users found.`}
          action={userTypeFilter === 'all' ? {
            label: "New User",
            onClick: () => router.push('/admin/users/new')
          } : undefined}
        />
      ) : (
        <Table striped>
          <thead>
            <tr>
              <th className="w-2/3">User</th>
              <th className="w-1/6">Status</th>
              <th className="w-1/6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr 
                  key={user.id}
                  onClick={() => handleRowClick(user.id)}
                  className="cursor-pointer hover:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar 
                        name={`${user.firstName} ${user.lastName}`}
                        className="size-12" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">
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
                        <div className="text-sm text-gray-600">
                          <a 
                            href={`mailto:${user.email}`} 
                            className="text-blue-600 hover:text-blue-500"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            {user.email}
                          </a>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatUserRole(user.userType, user.staffRole, user.radioStation)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    {user.isActive ? (
                      <Badge color="lime">Active</Badge>
                    ) : (
                      <Badge color="zinc">Inactive</Badge>
                    )}
                  </td>
                  <td className="py-4">
                    <Button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        router.push(`/admin/users/${user.id}/edit`);
                      }}
                      outline
                      className="text-sm"
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {pagination && filteredUsers.length > 0 && (
        <div className="flex justify-end">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
} 