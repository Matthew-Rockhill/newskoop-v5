'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function AdminNewsroomCatchAll() {
  const router = useRouter();
  const params = useParams();
  
  useEffect(() => {
    console.log('🚨 CAUGHT: Old admin/newsroom route accessed');
    console.log('🚨 Path segments:', params.path);
    console.log('🚨 Full URL:', window.location.href);
    console.log('🚨 Referrer:', document.referrer);
    console.log('🚨 User agent:', navigator.userAgent);
    
    // Redirect to the new location
    const newPath = `/newsroom/${Array.isArray(params.path) ? params.path.join('/') : params.path || ''}`;
    console.log('🚨 Redirecting to:', newPath);
    router.replace(newPath);
  }, [params, router]);
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">Redirecting...</h2>
        <p className="mt-2 text-sm text-gray-600">
          Old route detected, redirecting to new location
        </p>
      </div>
    </div>
  );
}