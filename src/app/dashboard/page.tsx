'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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

    // Route based on user type and role
    const userType = session.user.userType;
    const staffRole = session.user.staffRole;
    console.log('👤 Dashboard Router - User Type:', userType);
    console.log('👤 Dashboard Router - Staff Role:', staffRole);
    console.log('👤 Dashboard Router - Full User:', session.user);
    
    // Radio users go to radio zone
    if (userType === 'RADIO') {
      console.log('📻 Dashboard Router - RADIO user, redirecting to /radio');
      router.push('/radio');
    }
    // EDITOR goes to editorial dashboard
    else if (staffRole === 'EDITOR') {
      console.log('📊 Dashboard Router - EDITOR, redirecting to /newsroom/editorial-dashboard');
      router.push('/newsroom/editorial-dashboard');
    }
    // Other editorial staff go to personal newsroom dashboard
    else if (staffRole === 'INTERN' || staffRole === 'JOURNALIST' || staffRole === 'SUB_EDITOR') {
      console.log('📰 Dashboard Router - Editorial staff, redirecting to /newsroom');
      router.push('/newsroom');
    } 
    // ADMIN goes to admin dashboard only
    else if (staffRole === 'ADMIN') {
      console.log('👑 Dashboard Router - ADMIN, redirecting to /admin');
      router.push('/admin');
    }
    // SUPERADMIN goes to super admin dashboard
    else if (staffRole === 'SUPERADMIN') {
      console.log('🦸 Dashboard Router - SUPERADMIN, redirecting to /admin/super');
      router.push('/admin/super');
    }
    // Default fallback
    else {
      console.log('❓ Dashboard Router - Unknown role, redirecting to /');
      router.push('/');
    }
  }, [session, status, router]);

  // Show loading state while determining where to redirect
  return (
    <LoadingSpinner label="Redirecting to your dashboard..." />
  );
}