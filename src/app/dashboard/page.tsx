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
    
    // Editorial staff (including EDITOR) go to newsroom
    if (staffRole === 'INTERN' || staffRole === 'JOURNALIST' || staffRole === 'SUB_EDITOR' || staffRole === 'EDITOR') {
      router.push('/newsroom');
    } 
    // ADMIN goes to admin dashboard only
    else if (staffRole === 'ADMIN') {
      router.push('/admin');
    }
    // SUPERADMIN goes to admin dashboard (they can access both from there)
    else if (staffRole === 'SUPERADMIN') {
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