'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DashboardRouter() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('🔄 Dashboard Router - Status:', status);
    console.log('🔄 Dashboard Router - Session:', session);
    
    if (status === 'loading') return;
    
    if (!session) {
      console.log('❌ Dashboard Router - No session, redirecting to login');
      router.push('/login');
      return;
    }

    // Route based on user role
    const staffRole = session.user.staffRole;
    console.log('👤 Dashboard Router - Staff Role:', staffRole);
    console.log('👤 Dashboard Router - Full User:', session.user);
    
    // Editorial staff (including EDITOR) go to newsroom
    if (staffRole === 'INTERN' || staffRole === 'JOURNALIST' || staffRole === 'SUB_EDITOR' || staffRole === 'EDITOR') {
      console.log('📰 Dashboard Router - Editorial staff, redirecting to /newsroom');
      router.push('/newsroom');
    } 
    // ADMIN goes to admin dashboard only
    else if (staffRole === 'ADMIN') {
      console.log('👑 Dashboard Router - ADMIN, redirecting to /admin');
      router.push('/admin');
    }
    // SUPERADMIN goes to admin dashboard (they can access both from there)
    else if (staffRole === 'SUPERADMIN') {
      console.log('🦸 Dashboard Router - SUPERADMIN, redirecting to /admin');
      router.push('/admin');
    }
    // Default fallback
    else {
      console.log('❓ Dashboard Router - Unknown role, redirecting to /');
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