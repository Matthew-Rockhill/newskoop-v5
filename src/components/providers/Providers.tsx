'use client';

import { QueryProvider } from './QueryProvider';
import { SessionProvider } from 'next-auth/react';
import { AblyProvider } from './AblyProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <QueryProvider>
        <AblyProvider>{children}</AblyProvider>
      </QueryProvider>
    </SessionProvider>
  );
} 