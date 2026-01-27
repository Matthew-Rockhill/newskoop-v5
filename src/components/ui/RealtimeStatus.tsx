'use client';

import { useAblyConnection } from '@/hooks/realtime/useAblyConnection';

export function RealtimeStatus() {
  const { isConnected, isConnecting, isDisabled, error } = useAblyConnection();

  if (isDisabled) return null;

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Sync error
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-600">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        Connecting...
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Live
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <span className="h-2 w-2 rounded-full bg-zinc-400" />
      Offline
    </div>
  );
}
