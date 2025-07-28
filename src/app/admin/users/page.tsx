import { Suspense } from 'react';
import { UserList } from '@/components/admin/UserList';
import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'User Management - Newskoop Admin',
};

export default function UsersPage() {
  return (
    <Container>
      <div className="py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <UserList />
        </Suspense>
      </div>
    </Container>
  );
} 