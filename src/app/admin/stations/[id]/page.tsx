'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { RadioIcon } from '@heroicons/react/24/outline';
import { StationAnalyticsPanel } from '@/components/admin/StationAnalyticsPanel';

// Define Station type locally
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
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber?: string | null;
    isPrimaryContact: boolean;
  }>;
  _count: {
    users: number;
  };
};

// Helper function to format province names
const formatProvince = (province: string) => {
  return province
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export default function StationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStation = async () => {
      try {
        const response = await fetch(`/api/stations/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch station');
        }
        const data = await response.json();
        setStation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchStation();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RadioIcon className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-2 text-sm text-zinc-500">Loading station details...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (error || !station) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RadioIcon className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-2 text-sm text-zinc-500">
              {error || 'Station not found'}
            </p>
            <Button 
              onClick={() => router.push('/admin/stations')}
              className="mt-4"
              outline
            >
              Back to Stations
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-8 space-y-6">
        <PageHeader
          title="Station Details"
          action={{
            label: "Edit Station",
            onClick: () => router.push(`/admin/stations/${station.id}/edit`)
          }}
        />

        {/* Station Information Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-start gap-4">
              <Avatar 
                src={station.logoUrl} 
                name={station.name}
                className="size-16" 
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base/7 font-semibold text-zinc-900">{station.name}</h3>
                  {station.isActive ? (
                    <Badge color="lime">Active</Badge>
                  ) : (
                    <Badge color="zinc">Inactive</Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-sm text-zinc-600">
                  <div>Province: {formatProvince(station.province)}</div>
                  {station.contactEmail && (
                    <div>
                      Email: <a href={`mailto:${station.contactEmail}`} className="text-blue-600 hover:text-blue-500">
                        {station.contactEmail}
                      </a>
                    </div>
                  )}
                  {station.contactNumber && (
                    <div>Phone: {station.contactNumber}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Access Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base/7 font-semibold text-zinc-900 mb-3">Content Access</h3>
                         <div className="flex items-center gap-2">
               {station.hasContentAccess ? (
                 <>
                   <Badge color="green">Enabled</Badge>
                   <span className="text-sm text-zinc-600">This station has access to all content.</span>
                 </>
               ) : (
                 <>
                   <Badge color="red">Disabled</Badge>
                   <span className="text-sm text-zinc-600">This station does not have content access.</span>
                 </>
               )}
             </div>
          </div>
        </div>

        {/* Primary Contact Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base/7 font-semibold text-zinc-900 mb-3">Primary Contact</h3>
            {(() => {
              const primaryContact = station.users.find(user => user.isPrimaryContact);
              return primaryContact ? (
                <div className="flex items-start gap-4">
                  <Avatar 
                    name={`${primaryContact.firstName} ${primaryContact.lastName}`}
                    className="size-12" 
                  />
                  <div>
                    <div className="font-medium text-zinc-900">
                      {primaryContact.firstName} {primaryContact.lastName}
                    </div>
                    <div className="text-sm text-zinc-600">
                      <a href={`mailto:${primaryContact.email}`} className="text-blue-600 hover:text-blue-500">
                        {primaryContact.email}
                      </a>
                    </div>
                    {primaryContact.mobileNumber && (
                      <div className="text-sm text-zinc-600">
                        {primaryContact.mobileNumber}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No primary contact assigned</p>
              );
            })()}
          </div>
        </div>

        {/* Usage Analytics */}
        <StationAnalyticsPanel stationId={station.id} />

        {/* Associated Users Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base/7 font-semibold text-zinc-900">Associated Users</h3>
              <Badge color="zinc" className="text-xs">
                {station.users.filter(user => !user.isPrimaryContact).length} {station.users.filter(user => !user.isPrimaryContact).length === 1 ? 'user' : 'users'}
              </Badge>
            </div>
            {(() => {
              const otherUsers = station.users.filter(user => !user.isPrimaryContact);
              return otherUsers.length > 0 ? (
                <div className="space-y-4">
                  {otherUsers.map((user) => (
                    <div key={user.id} className="flex items-start gap-4">
                      <Avatar 
                        name={`${user.firstName} ${user.lastName}`}
                        className="size-10" 
                      />
                      <div>
                        <div className="font-medium text-zinc-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-zinc-600">
                          <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-500">
                            {user.email}
                          </a>
                        </div>
                        {user.mobileNumber && (
                          <div className="text-sm text-zinc-600">
                            {user.mobileNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No additional users assigned to this station.</p>
              );
            })()}
          </div>
        </div>
      </div>
    </Container>
  );
} 