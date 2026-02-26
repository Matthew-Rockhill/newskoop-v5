'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { RadioNavbar } from '@/components/radio/RadioNavbar';

export default function RadioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/login');
      return;
    }

    // Allow both RADIO and STAFF users to access this module
    if (!['RADIO', 'STAFF'].includes(session.user.userType)) {
      router.push('/dashboard');
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-kelly-green"></div>
          <p className="mt-4 text-zinc-600">Loading Radio Station Zone...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || !['RADIO', 'STAFF'].includes(session.user.userType)) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top Navigation */}
      <RadioNavbar />
      
      {/* Main Content */}
      <main className="pt-16"> {/* Offset for fixed navbar */}
        {children}
      </main>
    </div>
  );
}