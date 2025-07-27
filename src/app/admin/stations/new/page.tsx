'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';
import StationCreationForm from '@/components/admin/StationCreationForm';

export default function NewStationPage() {
  const router = useRouter();

  return (
    <Container>
      <div className="space-y-8">
        <PageHeader
          title="Create New Radio Station"
          description="Add a new radio station to the platform."
          action={{
            label: "Back to Stations",
            onClick: () => router.push('/admin/stations')
          }}
        />
        
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <StationCreationForm />
          </div>
        </div>
      </div>
    </Container>
  );
} 