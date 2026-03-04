import { Suspense } from 'react';
import { UserList } from '@/components/admin/UserList';
import { Container } from '@/components/ui/container';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const metadata = {
  title: 'User Management - Newskoop Admin',
};

export default function UsersPage() {
  return (
    <Container>
      <div className="py-8">
        <Suspense fallback={<LoadingSpinner />}>
          <UserList />
        </Suspense>
      </div>
    </Container>
  );
} 