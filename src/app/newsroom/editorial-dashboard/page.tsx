'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PipelineOverview } from '@/components/newsroom/editorial-dashboard/PipelineOverview';
import { QueueDetail } from '@/components/newsroom/editorial-dashboard/QueueDetail';
import { TeamWorkload } from '@/components/newsroom/editorial-dashboard/TeamWorkload';
import { TimeSensitiveContent } from '@/components/newsroom/editorial-dashboard/TimeSensitiveContent';
import { ReassignModal } from '@/components/newsroom/editorial-dashboard/ReassignModal';
import {
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface DashboardData {
  pipelineMetrics: any[];
  reviewerWorkload: {
    journalists: any[];
    subEditors: any[];
  };
  queues: {
    review: any[];
    approval: any[];
  };
  workflowHealth: {
    totalInPipeline: number;
    publishedToday: number;
    publishedThisWeek: number;
    averageThroughput: number;
    bottleneckStage: string | null;
    bottleneckCount: number;
  };
  timeSensitiveStories: any[];
  timestamp: string;
}

export default function EditorialDashboardPage() {
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignData, setReassignData] = useState<{
    storyId: string;
    storyTitle: string;
    currentAssignee: string | null;
    type: 'reviewer' | 'approver';
  } | null>(null);

  const queryClient = useQueryClient();

  // Fetch dashboard data with auto-refresh every 30 seconds
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['editorial-dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/newsroom/dashboard/editorial-metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 25000,
  });

  const handleReassign = (storyId: string, type: 'reviewer' | 'approver') => {
    // Find story details from queues
    const queue = type === 'reviewer' ? data?.queues.review : data?.queues.approval;
    const story = queue?.find((s: any) => s.id === storyId);

    if (story) {
      setReassignData({
        storyId,
        storyTitle: story.title,
        currentAssignee: story.assignedToName,
        type,
      });
      setReassignModalOpen(true);
    }
  };

  const handleReassignSubmit = async (
    storyId: string,
    newAssigneeId: string,
    type: 'reviewer' | 'approver'
  ) => {
    const response = await fetch(`/api/newsroom/stories/${storyId}/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        assignedToId: newAssigneeId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reassign story');
    }

    // Refresh dashboard data
    queryClient.invalidateQueries({ queryKey: ['editorial-dashboard'] });
  };

  const handleViewStory = (storyId: string) => {
    window.open(`/newsroom/stories/${storyId}`, '_blank');
  };

  if (error) {
    return (
      <Container className="py-8">
        <div className="text-center py-12">
          <Text className="text-red-600">Failed to load dashboard data</Text>
          <Button color="primary" onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Heading level={1} className="text-3xl font-bold text-gray-900">
            Editorial Dashboard
          </Heading>
          <Text className="text-gray-600 mt-2">
            Monitor workflow health, team workload, and content pipeline
          </Text>
        </div>
        <Button
          color="white"
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Workflow Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-600">In Pipeline</Text>
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <Heading level={2} className="text-3xl font-bold text-gray-900">
                {data?.workflowHealth.totalInPipeline || 0}
              </Heading>
              <Text className="text-sm text-gray-500 mt-1">Active stories</Text>
            </>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-600">Published Today</Text>
            <ChartBarIcon className="h-5 w-5 text-green-600" />
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <Heading level={2} className="text-3xl font-bold text-gray-900">
                {data?.workflowHealth.publishedToday || 0}
              </Heading>
              <Text className="text-sm text-gray-500 mt-1">Stories published</Text>
            </>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-600">This Week</Text>
            <ChartBarIcon className="h-5 w-5 text-purple-600" />
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <Heading level={2} className="text-3xl font-bold text-gray-900">
                {data?.workflowHealth.publishedThisWeek || 0}
              </Heading>
              <Text className="text-sm text-gray-500 mt-1">Stories published</Text>
            </>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-600">Throughput</Text>
            <ClockIcon className="h-5 w-5 text-orange-600" />
          </div>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <Heading level={2} className="text-3xl font-bold text-gray-900">
                {data?.workflowHealth.averageThroughput.toFixed(1) || '0.0'}
              </Heading>
              <Text className="text-sm text-gray-500 mt-1">Stories per day</Text>
            </>
          )}
        </Card>
      </div>

      {/* Pipeline Overview */}
      <div className="mb-8">
        <PipelineOverview metrics={data?.pipelineMetrics || []} isLoading={isLoading} />
      </div>

      {/* Review and Approval Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <QueueDetail
          title="Journalist Review Queue"
          stories={data?.queues.review || []}
          type="review"
          isLoading={isLoading}
          onReassign={(storyId) => handleReassign(storyId, 'reviewer')}
          onViewStory={handleViewStory}
        />
        <QueueDetail
          title="Sub-Editor Approval Queue"
          stories={data?.queues.approval || []}
          type="approval"
          isLoading={isLoading}
          onReassign={(storyId) => handleReassign(storyId, 'approver')}
          onViewStory={handleViewStory}
        />
      </div>

      {/* Team Workload */}
      <div className="mb-8">
        <TeamWorkload
          journalists={data?.reviewerWorkload.journalists || []}
          subEditors={data?.reviewerWorkload.subEditors || []}
          isLoading={isLoading}
        />
      </div>

      {/* Time-Sensitive Content */}
      <div className="mb-8">
        <TimeSensitiveContent
          stories={data?.timeSensitiveStories || []}
          isLoading={isLoading}
          onViewStory={handleViewStory}
        />
      </div>

      {/* Reassignment Modal */}
      {reassignData && (
        <ReassignModal
          isOpen={reassignModalOpen}
          onClose={() => {
            setReassignModalOpen(false);
            setReassignData(null);
          }}
          storyId={reassignData.storyId}
          storyTitle={reassignData.storyTitle}
          currentAssignee={reassignData.currentAssignee}
          type={reassignData.type}
          availableUsers={
            reassignData.type === 'reviewer'
              ? data?.reviewerWorkload.journalists || []
              : data?.reviewerWorkload.subEditors || []
          }
          onReassign={handleReassignSubmit}
        />
      )}

      {/* Last Updated */}
      {data?.timestamp && !isLoading && (
        <div className="text-center mt-8">
          <Text className="text-xs text-gray-500">
            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
          </Text>
        </div>
      )}
    </Container>
  );
}
