'use client';

import { useState } from 'react';
import { useUsers } from '@/hooks/use-users';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { UserForm } from './UserForm';
import { UsersIcon } from '@heroicons/react/24/outline';
import type { User, UserType, StaffRole } from '@prisma/client';

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  userType: UserType;
  staffRole?: StaffRole;
  isActive: boolean;
}

interface UserWithStation extends User {
  station?: {
    id: string;
    name: string;
  };
}

export function UserList() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    users,
    pagination,
    isLoading,
    filters,
    setFilters,
    createUser,
    updateUser,
    deleteUser,
    isCreating,
    isUpdating,
    isDeleting,
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

  const handleCreateUser = async (data: UserFormData) => {
    await createUser(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!selectedUser) return;
    await updateUser({ id: selectedUser.id, data });
    setSelectedUser(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteUser(id);
    }
  };

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
          onClick: () => setIsCreateDialogOpen(true)
        }}
      />

      {!isLoading && users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users"
          description="Get started by creating a new user."
          action={{
            label: "New User",
            onClick: () => setIsCreateDialogOpen(true)
          }}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center">
                      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-zinc-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-zinc-600">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-zinc-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <Badge color="zinc">
                      {user.userType === 'STAFF' ? user.staffRole : 'Radio Station'}
                    </Badge>
                  </td>
                  <td>
                    <Switch
                      checked={user.isActive}
                      onChange={(checked) => 
                        updateUser({ id: user.id, data: { isActive: checked } })
                      }
                      color="green"
                    />
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedUser(user)}
                        outline
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={isDeleting}
                        color="primary"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {pagination && users.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}

      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="Create User"
      >
        <UserForm
          onSubmit={handleCreateUser}
          isSubmitting={isCreating}
        />
      </Dialog>

      {selectedUser && (
        <Dialog
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title="Edit User"
        >
          <UserForm
            user={selectedUser}
            onSubmit={handleUpdateUser}
            isSubmitting={isUpdating}
          />
        </Dialog>
      )}
    </div>
  );
} 