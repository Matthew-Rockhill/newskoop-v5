import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStations } from '@/hooks/use-stations';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { RadioIcon } from '@heroicons/react/24/outline';

// Define Station type locally since it's not exported from types
type Station = {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  province: string;
  contactNumber?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  isActive: boolean;
  hasContentAccess: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format province names
const formatProvince = (province: string) => {
  return province
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export function StationList() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    stations,
    pagination,
    isLoading,
    setFilters,
    updateStation,
  } = useStations({
    perPage: 10,
  });

  const router = useRouter();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters((prev) => ({ ...prev, query, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleRowClick = (stationId: string) => {
    router.push(`/admin/stations/${stationId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Radio Stations"
        searchProps={{
          value: searchQuery,
          onChange: handleSearch,
          placeholder: "Search stations..."
        }}
        action={{
          label: "Create",
          onClick: () => router.push('/admin/stations/new')
        }}
      />

      {!isLoading && stations.length === 0 ? (
        <EmptyState
          icon={RadioIcon}
          title="No radio stations"
          description="Get started by creating a new radio station."
          action={{
            label: "New Station",
            onClick: () => router.push('/admin/stations/new')
          }}
        />
      ) : (
        <Table striped>
          <thead>
            <tr>
              <th className="w-2/3">Station</th>
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
              stations.map((station) => (
                <tr 
                  key={station.id}
                  onClick={() => handleRowClick(station.id)}
                  className="cursor-pointer hover:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar 
                        src={station.logoUrl} 
                        name={station.name}
                        className="size-12" 
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{station.name}</div>
                        <div className="text-sm text-gray-600 truncate">
                          {station.contactEmail && (
                            <a 
                              href={`mailto:${station.contactEmail}`} 
                              className="text-blue-600 hover:text-blue-500"
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            >
                              {station.contactEmail}
                            </a>
                          )}
                          {!station.contactEmail && station.contactNumber && (
                            <span>{station.contactNumber}</span>
                          )}
                          {!station.contactEmail && !station.contactNumber && (
                            <span>No contact info</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatProvince(station.province)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    {station.isActive ? (
                      <Badge color="lime">Active</Badge>
                    ) : (
                      <Badge color="zinc">Inactive</Badge>
                    )}
                  </td>
                  <td className="py-4">
                    <Button
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/admin/stations/${station.id}/edit`);
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

      {pagination && stations.length > 0 && (
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