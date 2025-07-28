'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { RadioIcon } from '@heroicons/react/24/outline';
import StationEditForm from '@/components/admin/StationEditForm';

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
};

export default function StationEditPage() {
  const params = useParams();
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
            <RadioIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Loading station...</p>
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
            <RadioIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {error || 'Station not found'}
            </p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-8">
        <StationEditForm station={station} />
      </div>
    </Container>
  );
} 