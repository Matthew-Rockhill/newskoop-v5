'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChartBarIcon,
  EyeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface StationInfo {
  id: string;
  name: string;
  province: string;
  isActive: boolean;
}

interface OverviewStats {
  totalViews: number;
  uniqueUsers: number;
  activeStations: number;
  avgViewsPerDay: number;
}

function computeChange(current: number, previous: number): { text: string; type: 'positive' | 'negative' | 'neutral' } {
  if (previous === 0) {
    return current > 0
      ? { text: '+100%', type: 'positive' }
      : { text: 'No change', type: 'neutral' };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { text: `+${pct}%`, type: 'positive' };
  if (pct < 0) return { text: `${pct}%`, type: 'negative' };
  return { text: 'No change', type: 'neutral' };
}

export default function StationAnalyticsDrillDown() {
  const params = useParams();
  const router = useRouter();
  const stationId = params.id as string;
  const [dateRange, setDateRange] = useState('30');

  const days = parseInt(dateRange);
  const startDate = startOfDay(subDays(new Date(), days));
  const endDate = endOfDay(new Date());
  const prevEndDate = startOfDay(subDays(new Date(), days));
  const prevStartDate = startOfDay(subDays(new Date(), days * 2));

  // Fetch station info
  const { data: station } = useQuery<StationInfo>({
    queryKey: ['station-info', stationId],
    queryFn: async () => {
      const response = await fetch(`/api/stations/${stationId}`);
      if (!response.ok) throw new Error('Failed to fetch station');
      return response.json();
    },
  });

  // Current period overview
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewStats>({
    queryKey: ['station-drill-overview', stationId, startDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/overview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&stationId=${stationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch overview');
      return response.json();
    },
  });

  // Previous period for comparison
  const { data: prevOverview } = useQuery<OverviewStats>({
    queryKey: ['station-drill-overview-prev', stationId, prevStartDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/overview?startDate=${prevStartDate.toISOString()}&endDate=${prevEndDate.toISOString()}&stationId=${stationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch previous overview');
      return response.json();
    },
  });

  // Platform-wide overview for comparison
  const { data: platformOverview } = useQuery<OverviewStats>({
    queryKey: ['station-drill-platform', startDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/overview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch platform overview');
      return response.json();
    },
  });

  // Time series
  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['station-drill-timeseries', stationId, startDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/timeseries?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&stationId=${stationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch time series');
      return response.json();
    },
  });

  // Top content
  const { data: topContent, isLoading: topContentLoading } = useQuery({
    queryKey: ['station-drill-top-content', stationId, startDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/top-content?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&stationId=${stationId}&limit=10`
      );
      if (!response.ok) throw new Error('Failed to fetch top content');
      return response.json();
    },
  });

  const viewsChange = overview && prevOverview
    ? computeChange(overview.totalViews, prevOverview.totalViews)
    : null;
  const usersChange = overview && prevOverview
    ? computeChange(overview.uniqueUsers, prevOverview.uniqueUsers)
    : null;

  // Platform comparison
  const platformShare = overview && platformOverview && platformOverview.totalViews > 0
    ? Math.round((overview.totalViews / platformOverview.totalViews) * 100)
    : null;

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title={station?.name ? `${station.name} Analytics` : 'Station Analytics'}
          description={station ? `Detailed usage metrics for ${station.name}` : 'Loading...'}
          actions={
            <div className="flex items-center gap-4">
              <Button
                color="white"
                onClick={() => router.push(`/admin/stations/${stationId}`)}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Station
              </Button>
              <div className="flex gap-2">
                <Button
                  color={dateRange === '7' ? 'primary' : 'white'}
                  onClick={() => setDateRange('7')}
                >
                  7d
                </Button>
                <Button
                  color={dateRange === '30' ? 'primary' : 'white'}
                  onClick={() => setDateRange('30')}
                >
                  30d
                </Button>
                <Button
                  color={dateRange === '90' ? 'primary' : 'white'}
                  onClick={() => setDateRange('90')}
                >
                  90d
                </Button>
              </div>
            </div>
          }
        />

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Text className="text-sm font-medium text-zinc-600">Total Views</Text>
              <div className="p-2 bg-blue-100 rounded-lg">
                <EyeIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            {overviewLoading ? (
              <div className="h-8 bg-zinc-200 rounded animate-pulse" />
            ) : (
              <>
                <Heading level={2} className="text-3xl font-bold text-zinc-900">
                  {(overview?.totalViews || 0).toLocaleString()}
                </Heading>
                <div className="flex items-center gap-2 mt-1">
                  {viewsChange && (
                    <span className={`text-xs font-medium ${
                      viewsChange.type === 'positive' ? 'text-emerald-600' :
                      viewsChange.type === 'negative' ? 'text-rose-600' : 'text-zinc-500'
                    }`}>
                      {viewsChange.text}
                    </span>
                  )}
                  <Text className="text-xs text-zinc-500">vs prev {dateRange}d</Text>
                </div>
              </>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Text className="text-sm font-medium text-zinc-600">Unique Users</Text>
              <div className="p-2 bg-green-100 rounded-lg">
                <UserGroupIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            {overviewLoading ? (
              <div className="h-8 bg-zinc-200 rounded animate-pulse" />
            ) : (
              <>
                <Heading level={2} className="text-3xl font-bold text-zinc-900">
                  {(overview?.uniqueUsers || 0).toLocaleString()}
                </Heading>
                <div className="flex items-center gap-2 mt-1">
                  {usersChange && (
                    <span className={`text-xs font-medium ${
                      usersChange.type === 'positive' ? 'text-emerald-600' :
                      usersChange.type === 'negative' ? 'text-rose-600' : 'text-zinc-500'
                    }`}>
                      {usersChange.text}
                    </span>
                  )}
                  <Text className="text-xs text-zinc-500">vs prev {dateRange}d</Text>
                </div>
              </>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Text className="text-sm font-medium text-zinc-600">Avg. Views/Day</Text>
              <div className="p-2 bg-orange-100 rounded-lg">
                <ArrowTrendingUpIcon className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            {overviewLoading ? (
              <div className="h-8 bg-zinc-200 rounded animate-pulse" />
            ) : (
              <>
                <Heading level={2} className="text-3xl font-bold text-zinc-900">
                  {Math.round(overview?.avgViewsPerDay || 0).toLocaleString()}
                </Heading>
                <Text className="text-xs text-zinc-500 mt-1">Daily average for period</Text>
              </>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Text className="text-sm font-medium text-zinc-600">Platform Share</Text>
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            {overviewLoading ? (
              <div className="h-8 bg-zinc-200 rounded animate-pulse" />
            ) : (
              <>
                <Heading level={2} className="text-3xl font-bold text-zinc-900">
                  {platformShare !== null ? `${platformShare}%` : '0%'}
                </Heading>
                <Text className="text-xs text-zinc-500 mt-1">
                  of total platform views
                </Text>
              </>
            )}
          </Card>
        </div>

        {/* Time-series Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Heading level={2} className="text-xl font-semibold text-zinc-900">
                Views Over Time
              </Heading>
              <Text className="text-sm text-zinc-600 mt-1">
                Daily view counts for this station
              </Text>
            </div>
            <ChartBarIcon className="h-6 w-6 text-zinc-400" />
          </div>

          {timeSeriesLoading ? (
            <div className="h-64 bg-zinc-100 rounded animate-pulse" />
          ) : timeSeries && timeSeries.length > 0 ? (
            <div className="h-64 flex items-end justify-between gap-1">
              {timeSeries.map((item: any, index: number) => {
                const maxViews = Math.max(...timeSeries.map((d: any) => d.views), 1);
                const height = Math.max((item.views / maxViews) * 100, 2);
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative"
                      style={{ height: `${height}%` }}
                    >
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded whitespace-nowrap">
                        {format(new Date(item.date), 'MMM d')}: {item.views} views
                      </div>
                    </div>
                    {timeSeries.length <= 30 && index % 3 === 0 && (
                      <Text className="text-xs text-zinc-500 mt-2 transform -rotate-45 origin-top-left">
                        {format(new Date(item.date), 'MMM d')}
                      </Text>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-400">
              <Text>No view data available for this station</Text>
            </div>
          )}
        </Card>

        {/* Top Content for this Station */}
        <Card className="p-6">
          <Heading level={2} className="text-xl font-semibold text-zinc-900 mb-4">
            Most Viewed Content
          </Heading>

          {topContentLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-zinc-100 rounded animate-pulse" />
              ))}
            </div>
          ) : topContent && topContent.length > 0 ? (
            <div className="space-y-3">
              {topContent.map((item: any, index: number) => (
                <div
                  key={item.contentId}
                  className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Text className="font-medium text-zinc-900 truncate">
                          {item.content?.title || 'Unknown'}
                        </Text>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color="zinc" className="text-xs">
                            {item.contentType}
                          </Badge>
                          {item.content?.category && (
                            <Text className="text-xs text-zinc-500">
                              {item.content.category.name}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <Text className="font-semibold text-zinc-900">
                      {item.views.toLocaleString()}
                    </Text>
                    <Text className="text-xs text-zinc-500">views</Text>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-400">
              <Text>No content data available for this station</Text>
            </div>
          )}
        </Card>
      </div>
    </Container>
  );
}
