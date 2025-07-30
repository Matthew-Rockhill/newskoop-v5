'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DashboardRouter() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Route based on user role
    const staffRole = session.user.staffRole;
    
    // Editorial staff go to newsroom
    if (staffRole === 'INTERN' || staffRole === 'JOURNALIST' || staffRole === 'SUB_EDITOR') {
      router.push('/newsroom');
    } 
    // EDITOR can choose, but default to newsroom
    else if (staffRole === 'EDITOR') {
      router.push('/newsroom');
    }
    // Admin staff go to admin dashboard
    else if (staffRole === 'ADMIN' || staffRole === 'SUPERADMIN') {
      router.push('/admin');
    }
    // Default fallback
    else {
      router.push('/');
    }
  }, [session, status, router]);

  // Show loading state while determining where to redirect
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">Loading...</h2>
        <p className="mt-2 text-sm text-gray-600">Redirecting to your dashboard</p>
      </div>
    </div>
  );
}