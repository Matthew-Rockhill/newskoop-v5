import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStations } from '@/hooks/use-stations';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StationForm } from './StationForm';
import type { Station, StationFormData } from '@/types';
import { RadioIcon } from '@heroicons/react/24/outline';

export function StationList() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    stations,
    pagination,
    isLoading,
    filters,
    setFilters,
    createStation,
    updateStation,
    deleteStation,
    isCreating,
    isUpdating,
    isDeleting,
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

  const handleCreateStation = async (data: StationFormData) => {
    await createStation(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateStation = async (data: StationFormData) => {
    if (!selectedStation) return;
    await updateStation({ id: selectedStation.id, data });
    setSelectedStation(null);
  };

  const handleDeleteStation = async (id: string) => {
    if (confirm('Are you sure you want to delete this station?')) {
      await deleteStation(id);
    }
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
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Province</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : (
              stations.map((station) => (
                <tr key={station.id}>
                  <td>{station.name}</td>
                  <td>
                    <Badge color="zinc">
                      {station.province}
                    </Badge>
                  </td>
                  <td>
                    <div className="text-sm">
                      <div>{station.contactEmail}</div>
                      <div className="text-zinc-500">{station.contactNumber}</div>
                    </div>
                  </td>
                  <td>
                    <Switch
                      checked={station.isActive}
                      onChange={(checked: boolean) =>
                        updateStation({ id: station.id, data: { isActive: checked } })
                      }
                      color="green"
                    />
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedStation(station)}
                        outline
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteStation(station.id)}
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

      {pagination && stations.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}

      <Dialog
        open={!!selectedStation}
        onClose={() => setSelectedStation(null)}
        title="Edit Radio Station"
      >
        <StationForm
          station={selectedStation}
          onSubmit={handleUpdateStation}
          isSubmitting={isUpdating}
        />
      </Dialog>
    </div>
  );
} 