'use client';

import { useAbly } from '@/components/providers/AblyProvider';

export function useAblyConnection() {
  const {
    isConnected,
    isConnecting,
    connectionError,
    connectionHealthy,
    client,
  } = useAbly();

  return {
    isConnected,
    isConnecting,
    isDisabled: client === null,
    isHealthy: connectionHealthy,
    error: connectionError,
  };
}
