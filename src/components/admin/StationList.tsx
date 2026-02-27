'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useStations } from '@/hooks/use-stations';
import type { Station } from '@prisma/client';
import { DataList, type DataListColumn, type RowAction } from '@/components/ui/data-list';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { RadioIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Input, InputGroup } from '@/components/ui/input';
import { differenceInDays } from 'date-fns';

interface StationHealth {
  lastViewAt: string | null;
  views30d: number;
  userCount: number;
}

// Helper function to format province names
const formatProvince = (province: string) => {
  return province
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

function getHealthBadge(health: StationHealth | undefined): { color: 'green' | 'yellow' | 'red' | 'zinc'; label: string } {
  if (!health || !health.lastViewAt) {
    return { color: 'red', label: 'No Activity' };
  }

  const daysSinceLastView = differenceInDays(new Date(), new Date(health.lastViewAt));

  if (daysSinceLastView <= 7) {
    return { color: 'green', label: 'Active' };
  } else if (daysSinceLastView <= 30) {
    return { color: 'yellow', label: 'Idle' };
  } else {
    return { color: 'red', label: 'Inactive' };
  }
}

export function StationList() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const {
    stations,
    pagination,
    isLoading,
    setFilters,
  } = useStations({
    perPage: 10,
  });

  const { data: healthMap } = useQuery<Record<string, StationHealth>>({
    queryKey: ['station-health'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stations/health');
      if (!response.ok) throw new Error('Failed to fetch health');
      return response.json();
    },
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters((prev) => ({ ...prev, query, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Define columns for the DataList
  const columns: DataListColumn<Station>[] = useMemo(() => [
    {
      key: 'station',
      header: 'Station',
      priority: 1,
      width: 'expand',
      render: (station) => (
        <div className="flex items-center gap-4">
          <Avatar
            src={station.logoUrl ?? undefined}
            name={station.name}
            className="size-12"
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-zinc-900 dark:text-white truncate">
              {station.name}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
              {station.contactEmail && (
                <a
                  href={`mailto:${station.contactEmail}`}
                  className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  {station.contactEmail}
                </a>
              )}
              {!station.contactEmail && station.contactNumber && (
                <span>{station.contactNumber}</span>
              )}
              {!station.contactEmail && !station.contactNumber && (
                <span className="text-zinc-400">No contact info</span>
              )}
            </div>
            <div className="text-sm text-zinc-500">
              {formatProvince(station.province)}
            </div>
          </div>
        </div>
      ),
      mobileRender: (station) => (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Avatar
              src={station.logoUrl ?? undefined}
              name={station.name}
              className="size-10"
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-900 dark:text-white truncate">
                {station.name}
              </div>
              <div className="text-sm text-zinc-500 truncate">
                {formatProvince(station.province)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={station.isActive ? 'lime' : 'zinc'}>
              {station.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {healthMap && (
              <Badge color={getHealthBadge(healthMap[station.id]).color}>
                {getHealthBadge(healthMap[station.id]).label}
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'health',
      header: 'Health',
      priority: 2,
      width: 'shrink',
      align: 'center',
      render: (station) => {
        const health = healthMap?.[station.id];
        const badge = getHealthBadge(health);
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge color={badge.color}>{badge.label}</Badge>
            {health && (
              <span className="text-xs text-zinc-400">
                {health.userCount} {health.userCount === 1 ? 'user' : 'users'} • {health.views30d} views
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      priority: 3,
      width: 'shrink',
      align: 'center',
      render: (station) => (
        <Badge color={station.isActive ? 'lime' : 'zinc'}>
          {station.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ], [healthMap]);

  // Define row actions
  const rowActions: RowAction<Station>[] = useMemo(() => [
    {
      key: 'edit',
      label: 'Edit',
      icon: PencilIcon,
      href: (station) => `/admin/stations/${station.id}/edit`,
      onAction: () => {},
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Radio Stations"
        action={{
          label: "New Station",
          onClick: () => router.push('/admin/stations/new')
        }}
      />

      {/* Search */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <InputGroup>
            <MagnifyingGlassIcon data-slot="icon" />
            <Input
              type="search"
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search stations"
            />
          </InputGroup>
        </div>
      </div>

      <DataList<Station>
        items={stations}
        isLoading={isLoading}
        variant="table"
        columns={columns}
        striped
        rowActions={rowActions}
        onRowClick={(station) => router.push(`/admin/stations/${station.id}`)}
        pagination={pagination ? {
          page: pagination.page,
          pageSize: 10,
          total: pagination.total,
          onPageChange: handlePageChange,
        } : undefined}
        emptyState={{
          icon: RadioIcon,
          title: "No radio stations",
          description: "Get started by creating a new radio station.",
          action: {
            label: "New Station",
            onClick: () => router.push('/admin/stations/new'),
          },
        }}
        ariaLabel="Radio stations list"
      />
    </div>
  );
}
