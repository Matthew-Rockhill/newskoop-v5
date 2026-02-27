'use client';

import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  EyeIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface StationAnalyticsPanelProps {
  stationId: string;
}

export function StationAnalyticsPanel({ stationId }: StationAnalyticsPanelProps) {
  const startDate = startOfDay(subDays(new Date(), 30));
  const endDate = endOfDay(new Date());

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['station-analytics-overview', stationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/overview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&stationId=${stationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch overview');
      return response.json();
    },
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['station-analytics-timeseries', stationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/timeseries?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&stationId=${stationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch time series');
      return response.json();
    },
  });

  const { data: topContent, isLoading: topContentLoading } = useQuery({
    queryKey: ['station-analytics-top-content', stationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/top-content?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&stationId=${stationId}&limit=5`
      );
      if (!response.ok) throw new Error('Failed to fetch top content');
      return response.json();
    },
  });

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base/7 font-semibold text-zinc-900">Usage Analytics (Last 30 Days)</h3>
          <Link href={`/admin/analytics/station/${stationId}`}>
            <Button color="white" className="text-sm">
              <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
              Full Analytics
            </Button>
          </Link>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <EyeIcon className="h-4 w-4 text-blue-500" />
              <Text className="text-xs font-medium text-zinc-500">Total Views</Text>
            </div>
            {overviewLoading ? (
              <div className="h-6 w-16 bg-zinc-200 rounded animate-pulse" />
            ) : (
              <Text className="text-xl font-semibold text-zinc-900">
                {(overview?.totalViews || 0).toLocaleString()}
              </Text>
            )}
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserGroupIcon className="h-4 w-4 text-green-500" />
              <Text className="text-xs font-medium text-zinc-500">Unique Users</Text>
            </div>
            {overviewLoading ? (
              <div className="h-6 w-16 bg-zinc-200 rounded animate-pulse" />
            ) : (
              <Text className="text-xl font-semibold text-zinc-900">
                {(overview?.uniqueUsers || 0).toLocaleString()}
              </Text>
            )}
          </Card>
        </div>

        {/* Mini Sparkline */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ChartBarIcon className="h-4 w-4 text-zinc-400" />
            <Text className="text-xs font-medium text-zinc-500">Views Trend</Text>
          </div>
          {timeSeriesLoading ? (
            <div className="h-16 bg-zinc-100 rounded animate-pulse" />
          ) : timeSeries && timeSeries.length > 0 ? (
            <div className="h-16 flex items-end gap-px">
              {timeSeries.map((item: { date: string; views: number }, index: number) => {
                const maxViews = Math.max(...timeSeries.map((d: { views: number }) => d.views), 1);
                const height = Math.max((item.views / maxViews) * 100, 2);
                return (
                  <div
                    key={index}
                    className="flex-1 bg-blue-400 rounded-t hover:bg-blue-500 transition-colors"
                    style={{ height: `${height}%` }}
                    title={`${format(new Date(item.date), 'MMM d')}: ${item.views} views`}
                  />
                );
              })}
            </div>
          ) : (
            <Text className="text-xs text-zinc-400 text-center py-4">No view data yet</Text>
          )}
        </div>

        {/* Top 5 Content */}
        <div>
          <Heading level={4} className="text-sm font-medium text-zinc-700 mb-2">
            Top Content
          </Heading>
          {topContentLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-zinc-100 rounded animate-pulse" />
              ))}
            </div>
          ) : topContent && topContent.length > 0 ? (
            <div className="space-y-2">
              {topContent.map((item: { contentId: string; contentType: string; content: { title: string } | null; views: number }, index: number) => (
                <div
                  key={item.contentId}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-medium text-zinc-400 w-4">{index + 1}.</span>
                    <Text className="text-sm text-zinc-700 truncate">
                      {item.content?.title || 'Unknown'}
                    </Text>
                  </div>
                  <Text className="text-xs font-medium text-zinc-500 ml-2 flex-shrink-0">
                    {item.views} views
                  </Text>
                </div>
              ))}
            </div>
          ) : (
            <Text className="text-xs text-zinc-400 text-center py-3">No content viewed yet</Text>
          )}
        </div>
      </div>
    </div>
  );
}
