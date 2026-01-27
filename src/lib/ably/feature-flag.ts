export function isRealtimeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return process.env.ENABLE_REALTIME === 'true';
  }
  return process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true';
}

export function isRealtimeAvailable(): boolean {
  if (typeof window === 'undefined') {
    return !!process.env.ABLY_API_KEY;
  }
  return true; // Client uses token auth
}
