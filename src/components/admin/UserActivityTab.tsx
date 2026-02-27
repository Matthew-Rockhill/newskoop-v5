'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Select } from '@/components/ui/select';
import { ClockIcon } from '@heroicons/react/24/outline';
import { formatAuditAction } from '@/lib/format';
import { getAuditActionColor } from '@/lib/color-system';
import { SimplePagination } from '@/components/ui/pagination';

interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  user: {
    name: string;
  };
}

interface ActivityResponse {
  logs: ActivityEntry[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

interface UserActivityTabProps {
  userId: string;
}

const ACTION_CATEGORIES = [
  { value: '', label: 'All Actions' },
  { value: 'auth.login', label: 'Logins' },
  { value: 'auth.password', label: 'Password Changes' },
  { value: 'content', label: 'Content Actions' },
  { value: 'user', label: 'User Management' },
  { value: 'station', label: 'Station Management' },
];

export function UserActivityTab({ userId }: UserActivityTabProps) {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery<ActivityResponse>({
    queryKey: ['user-activity', userId, page, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString() });
      if (actionFilter) params.set('action', actionFilter);
      const response = await fetch(`/api/admin/users/${userId}/activity?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    },
  });

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="w-48"
        >
          {ACTION_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </Select>
        {data?.pagination && (
          <Text className="text-sm text-zinc-500">
            {data.pagination.total} {data.pagination.total === 1 ? 'entry' : 'entries'}
          </Text>
        )}
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-zinc-100 rounded animate-pulse" />
          ))}
        </div>
      ) : data?.logs && data.logs.length > 0 ? (
        <div className="divide-y divide-zinc-100">
          {data.logs.map((entry) => (
            <div key={entry.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <ClockIcon className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color={getAuditActionColor(entry.action)}>
                        {formatAuditAction(entry.action)}
                      </Badge>
                      {entry.entityType && (
                        <Text className="text-xs text-zinc-400">
                          {entry.entityType}
                        </Text>
                      )}
                    </div>
                    {entry.ipAddress && (
                      <Text className="text-xs text-zinc-400 mt-1">
                        IP: {entry.ipAddress}
                      </Text>
                    )}
                  </div>
                </div>
                <Text className="text-xs text-zinc-400 flex-shrink-0 whitespace-nowrap">
                  {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                </Text>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <ClockIcon className="mx-auto h-8 w-8 text-zinc-300" />
          <Text className="text-sm text-zinc-500 mt-2">No activity recorded</Text>
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && (
        <SimplePagination
          page={page}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
          className="pt-3"
        />
      )}
    </div>
  );
}
