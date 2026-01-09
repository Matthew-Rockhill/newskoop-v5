import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MenuItemType } from '@prisma/client';

export interface MenuItem {
  id: string;
  label: string;
  labelAfrikaans: string | null;
  type: MenuItemType;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    nameAfrikaans: string | null;
    slug: string;
  } | null;
  url: string | null;
  openInNewTab: boolean;
  parentId: string | null;
  sortOrder: number;
  isVisible: boolean;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  children?: MenuItem[];
}

interface MenuItemsResponse {
  menuItems: MenuItem[];
}

interface CreateMenuItemData {
  label: string;
  labelAfrikaans?: string;
  type: MenuItemType;
  categoryId?: string;
  url?: string;
  openInNewTab?: boolean;
  parentId?: string;
  sortOrder?: number;
  isVisible?: boolean;
  icon?: string;
}

interface UpdateMenuItemData {
  label?: string;
  labelAfrikaans?: string | null;
  type?: MenuItemType;
  categoryId?: string | null;
  url?: string | null;
  openInNewTab?: boolean;
  parentId?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
  icon?: string | null;
}

interface ReorderItem {
  id: string;
  parentId: string | null;
  sortOrder: number;
}

// Fetch all menu items (tree structure by default)
export function useMenuItems(flat: boolean = false) {
  return useQuery<MenuItemsResponse>({
    queryKey: ['menuItems', flat],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (flat) params.set('flat', 'true');

      const response = await fetch(`/api/newsroom/menu?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }
      return response.json();
    },
  });
}

// Fetch single menu item
export function useMenuItem(id: string | null) {
  return useQuery<MenuItem>({
    queryKey: ['menuItem', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const response = await fetch(`/api/newsroom/menu/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu item');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Create menu item
export function useCreateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMenuItemData) => {
      const response = await fetch('/api/newsroom/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create menu item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });
}

// Update menu item
export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMenuItemData }) => {
      const response = await fetch(`/api/newsroom/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update menu item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });
}

// Delete menu item
export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/menu/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete menu item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });
}

// Reorder menu items
export function useReorderMenuItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: ReorderItem[]) => {
      const response = await fetch('/api/newsroom/menu/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder menu items');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });
}
