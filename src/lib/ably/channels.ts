export const CHANNELS = {
  STORIES: 'newsroom:stories',
  BULLETINS: 'newsroom:bulletins',
  SHOWS: 'newsroom:shows',
  EPISODES: 'newsroom:episodes',
  DASHBOARD: 'newsroom:dashboard',
} as const;

export type ChannelName = (typeof CHANNELS)[keyof typeof CHANNELS];
