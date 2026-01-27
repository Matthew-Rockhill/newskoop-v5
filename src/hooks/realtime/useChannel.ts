'use client';

import { useEffect, useCallback } from 'react';
import type * as Ably from 'ably';
import { useAbly } from '@/components/providers/AblyProvider';
import type { ChannelName } from '@/lib/ably/channels';

type MessageCallback = (message: Ably.Message) => void;

export function useChannel(
  channelName: ChannelName,
  callback: MessageCallback,
  eventName?: string
) {
  const { client, isConnected } = useAbly();

  const memoizedCallback = useCallback(callback, [callback]);

  useEffect(() => {
    if (!client || !isConnected) return;

    const channel = client.channels.get(channelName);

    if (eventName) {
      channel.subscribe(eventName, memoizedCallback);
    } else {
      channel.subscribe(memoizedCallback);
    }

    return () => {
      if (eventName) {
        channel.unsubscribe(eventName, memoizedCallback);
      } else {
        channel.unsubscribe(memoizedCallback);
      }
    };
  }, [client, isConnected, channelName, eventName, memoizedCallback]);
}
