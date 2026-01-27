import Ably from 'ably';
import { CHANNELS } from './channels';
import type { RealtimeEvent } from './types';
import { isRealtimeEnabled, isRealtimeAvailable } from './feature-flag';

let ablyRest: Ably.Rest | null = null;

function getAblyClient(): Ably.Rest | null {
  if (!isRealtimeEnabled() || !isRealtimeAvailable()) return null;
  if (!ablyRest) {
    ablyRest = new Ably.Rest(process.env.ABLY_API_KEY!);
  }
  return ablyRest;
}

// Non-blocking publish - never fails API requests
export async function publishEvent(
  channel: string,
  event: RealtimeEvent
): Promise<void> {
  const client = getAblyClient();
  if (!client) return;

  try {
    await client.channels.get(channel).publish(event.type, event);
  } catch (error) {
    console.error('[Ably] Failed to publish:', error);
    // Don't throw - real-time should never block operations
  }
}

// Convenience functions
export const publishStoryEvent = (event: RealtimeEvent) =>
  publishEvent(CHANNELS.STORIES, event);

export const publishBulletinEvent = (event: RealtimeEvent) =>
  publishEvent(CHANNELS.BULLETINS, event);

export const publishShowEvent = (event: RealtimeEvent) =>
  publishEvent(CHANNELS.SHOWS, event);

export const publishEpisodeEvent = (event: RealtimeEvent) =>
  publishEvent(CHANNELS.EPISODES, event);

export const publishDashboardEvent = (event: RealtimeEvent) =>
  publishEvent(CHANNELS.DASHBOARD, event);

// Helper to create events
export function createEvent<T>(
  type: string,
  entityType: 'story' | 'bulletin' | 'show' | 'episode',
  entityId: string,
  userId: string,
  data?: T,
  metadata?: Record<string, unknown>
): RealtimeEvent<T> {
  return {
    type,
    entityType,
    entityId,
    userId,
    data,
    metadata,
    timestamp: new Date().toISOString(),
  };
}
