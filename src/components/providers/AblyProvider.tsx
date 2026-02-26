'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';
import * as Ably from 'ably';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { CHANNELS } from '@/lib/ably/channels';
import type {
  StoryEvent,
  BulletinEvent,
  ShowEvent,
  EpisodeEvent,
} from '@/lib/ably/types';

interface AblyContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: Error | null;
  connectionHealthy: boolean;
  client: Ably.Realtime | null;
}

const AblyContext = createContext<AblyContextValue | null>(null);

export function AblyProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [connectionHealthy, setConnectionHealthy] = useState(true);
  const reconnectAttemptsRef = useRef(0);
  const wasDisconnectedRef = useRef(false);

  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true';

  // Initialize Ably client
  useEffect(() => {
    if (!isEnabled || status !== 'authenticated' || !session?.user) {
      return;
    }

    setIsConnecting(true);

    const ablyClient = new Ably.Realtime({
      authUrl: '/api/ably/token',
      authMethod: 'GET',
      autoConnect: true,
      disconnectedRetryTimeout: 15000,
      suspendedRetryTimeout: 30000,
    });

    ablyClient.connection.on('connected', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
      setConnectionHealthy(true);

      // If reconnecting, invalidate all queries to catch up
      if (wasDisconnectedRef.current) {
        console.log('[Ably] Reconnected - refreshing data');
        queryClient.invalidateQueries({ queryKey: ['stories'] });
        queryClient.invalidateQueries({ queryKey: ['bulletins'] });
        queryClient.invalidateQueries({ queryKey: ['shows'] });
        queryClient.invalidateQueries({ queryKey: ['episodes'] });
        queryClient.invalidateQueries({ queryKey: ['editorial-dashboard'] });
        wasDisconnectedRef.current = false;
      }
    });

    ablyClient.connection.on('disconnected', () => {
      setIsConnected(false);
      wasDisconnectedRef.current = true;
      reconnectAttemptsRef.current++;

      // After 3 failed reconnects, mark unhealthy for fallback polling
      if (reconnectAttemptsRef.current >= 3) {
        setConnectionHealthy(false);
      }
    });

    ablyClient.connection.on('failed', (stateChange) => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionHealthy(false);
      setConnectionError(
        new Error(stateChange.reason?.message || 'Connection failed')
      );
    });

    setClient(ablyClient);

    return () => {
      ablyClient.close();
      setClient(null);
      setIsConnected(false);
    };
  }, [isEnabled, status, session?.user, session?.user?.id, queryClient]);

  // Set up automatic cache invalidation subscriptions
  useEffect(() => {
    if (!client || !isConnected) return;

    const currentUserId = session?.user?.id;

    // Story events handler
    const storiesChannel = client.channels.get(CHANNELS.STORIES);
    const handleStoryEvent = (message: Ably.Message) => {
      const event = message.data as StoryEvent;

      // Skip self-generated events (optimistic updates handle these)
      if (event.userId === currentUserId) return;

      switch (event.type) {
        case 'story:created':
        case 'story:deleted':
          queryClient.invalidateQueries({ queryKey: ['stories'] });
          queryClient.invalidateQueries({ queryKey: ['translationTasks'] });
          break;

        case 'story:updated':
          queryClient.invalidateQueries({ queryKey: ['stories'] });
          queryClient.invalidateQueries({
            queryKey: ['story', event.entityId],
          });
          break;

        case 'story:stage_changed':
        case 'story:assigned':
          queryClient.invalidateQueries({ queryKey: ['stories'] });
          queryClient.invalidateQueries({
            queryKey: ['story', event.entityId],
          });
          queryClient.invalidateQueries({ queryKey: ['translationTasks'] });
          queryClient.invalidateQueries({ queryKey: ['editorial-dashboard'] });
          break;

        case 'story:commented':
          queryClient.invalidateQueries({
            queryKey: ['story', event.entityId],
          });
          break;
      }
    };
    storiesChannel.subscribe(handleStoryEvent);

    // Bulletin events handler
    const bulletinsChannel = client.channels.get(CHANNELS.BULLETINS);
    const handleBulletinEvent = (message: Ably.Message) => {
      const event = message.data as BulletinEvent;
      if (event.userId === currentUserId) return;

      queryClient.invalidateQueries({ queryKey: ['bulletins'] });
      if (event.entityId) {
        queryClient.invalidateQueries({
          queryKey: ['bulletin', event.entityId],
        });
      }
    };
    bulletinsChannel.subscribe(handleBulletinEvent);

    // Show events handler
    const showsChannel = client.channels.get(CHANNELS.SHOWS);
    const handleShowEvent = (message: Ably.Message) => {
      const event = message.data as ShowEvent;
      if (event.userId === currentUserId) return;

      queryClient.invalidateQueries({ queryKey: ['shows'] });
      if (event.entityId) {
        queryClient.invalidateQueries({ queryKey: ['shows', event.entityId] });
      }
    };
    showsChannel.subscribe(handleShowEvent);

    // Episode events handler
    const episodesChannel = client.channels.get(CHANNELS.EPISODES);
    const handleEpisodeEvent = (message: Ably.Message) => {
      const event = message.data as EpisodeEvent;
      if (event.userId === currentUserId) return;

      const showId = event.metadata?.showId;
      if (showId) {
        queryClient.invalidateQueries({ queryKey: ['episodes', showId] });
        queryClient.invalidateQueries({
          queryKey: ['episodes', showId, event.entityId],
        });
      }
    };
    episodesChannel.subscribe(handleEpisodeEvent);

    // Dashboard events handler
    const dashboardChannel = client.channels.get(CHANNELS.DASHBOARD);
    const handleDashboardEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-dashboard'] });
    };
    dashboardChannel.subscribe(handleDashboardEvent);

    return () => {
      storiesChannel.unsubscribe();
      bulletinsChannel.unsubscribe();
      showsChannel.unsubscribe();
      episodesChannel.unsubscribe();
      dashboardChannel.unsubscribe();
    };
  }, [client, isConnected, session?.user?.id, queryClient]);

  // Tab visibility optimization
  useEffect(() => {
    if (!client) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Optionally pause when hidden (comment out if you want always-on)
        // client.connection.close();
      } else {
        if (client.connection.state === 'closed') {
          client.connection.connect();
        }
        // Refresh data when tab becomes visible
        queryClient.invalidateQueries();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [client, queryClient]);

  const value: AblyContextValue = {
    isConnected,
    isConnecting,
    connectionError,
    connectionHealthy,
    client,
  };

  return <AblyContext.Provider value={value}>{children}</AblyContext.Provider>;
}

export function useAbly(): AblyContextValue {
  const context = useContext(AblyContext);
  if (!context) {
    return {
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      connectionHealthy: true,
      client: null,
    };
  }
  return context;
}
