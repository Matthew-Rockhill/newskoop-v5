import type { StoryStage } from '@prisma/client';

// Base event structure
export interface RealtimeEvent<T = unknown> {
  type: string;
  entityId: string;
  entityType: 'story' | 'bulletin' | 'show' | 'episode';
  data?: T;
  userId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Story events
export interface StoryStageChangedEvent extends RealtimeEvent {
  type: 'story:stage_changed';
  entityType: 'story';
  metadata: {
    previousStage: StoryStage;
    newStage: StoryStage;
    assignedReviewerId?: string;
    assignedApproverId?: string;
  };
}

export interface StoryAssignedEvent extends RealtimeEvent {
  type: 'story:assigned';
  entityType: 'story';
  metadata: {
    assignmentType: 'reviewer' | 'approver' | 'translator';
    previousAssigneeId?: string;
    newAssigneeId: string;
  };
}

export type StoryEvent =
  | ({ type: 'story:created'; entityType: 'story' } & RealtimeEvent)
  | ({ type: 'story:updated'; entityType: 'story' } & RealtimeEvent)
  | ({ type: 'story:deleted'; entityType: 'story' } & RealtimeEvent)
  | StoryStageChangedEvent
  | StoryAssignedEvent
  | ({ type: 'story:commented'; entityType: 'story' } & RealtimeEvent);

// Bulletin events
export type BulletinEvent =
  | ({ type: 'bulletin:created' } & RealtimeEvent)
  | ({ type: 'bulletin:updated' } & RealtimeEvent)
  | ({ type: 'bulletin:deleted' } & RealtimeEvent)
  | ({ type: 'bulletin:status_changed'; metadata: { previousStatus: string; newStatus: string } } & RealtimeEvent)
  | ({ type: 'bulletin:stories_reordered' } & RealtimeEvent);

// Show/Episode events
export type ShowEvent =
  | ({ type: 'show:created' } & RealtimeEvent)
  | ({ type: 'show:updated' } & RealtimeEvent)
  | ({ type: 'show:deleted' } & RealtimeEvent);

export type EpisodeEvent =
  | ({ type: 'episode:created'; metadata: { showId: string } } & RealtimeEvent)
  | ({ type: 'episode:updated'; metadata: { showId: string } } & RealtimeEvent)
  | ({ type: 'episode:published'; metadata: { showId: string } } & RealtimeEvent);

// Dashboard events
export type DashboardEvent =
  | ({ type: 'dashboard:metrics_updated'; metadata: { trigger: string } } & RealtimeEvent);

// Union of all event types
export type NewsroomEvent =
  | StoryEvent
  | BulletinEvent
  | ShowEvent
  | EpisodeEvent
  | DashboardEvent;
