'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import {
  ChartBarIcon,
  EyeIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30'); // days
  const [isExporting, setIsExporting] = useState(false);

  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
  const endDate = endOfDay(new Date());

  // Handle CSV export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch(
        `/api/admin/analytics/export?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the CSV content
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export analytics data');
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch overview stats
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/overview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch overview');
      return response.json();
    },
  });

  // Fetch time-series data
  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['analytics-timeseries', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/timeseries?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch time series');
      return response.json();
    },
  });

  // Fetch top content
  const { data: topContent, isLoading: topContentLoading } = useQuery({
    queryKey: ['analytics-top-content', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/top-content?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=10`
      );
      if (!response.ok) throw new Error('Failed to fetch top content');
      return response.json();
    },
  });

  // Fetch station activity
  const { data: stationActivity, isLoading: stationActivityLoading } = useQuery({
    queryKey: ['analytics-stations', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/analytics/stations?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=10`
      );
      if (!response.ok) throw new Error('Failed to fetch station activity');
      return response.json();
    },
  });

  return (
    <Container className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Heading level={1} className="text-3xl font-bold text-gray-900">
            Content Analytics
          </Heading>
          <Text className="text-gray-600 mt-2">
            Track content views, station activity, and engagement metrics
          </Text>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Range Selector */}
          <div className="flex gap-2">
            <Button
              color={dateRange === '7' ? 'primary' : 'white'}
              onClick={() => setDateRange('7')}
            >
              Last 7 days
            </Button>
            <Button
              color={dateRange === '30' ? 'primary' : 'white'}
              onClick={() => setDateRange('30')}
            >
              Last 30 days
            </Button>
            <Button
              color={dateRange === '90' ? 'primary' : 'white'}
              onClick={() => setDateRange('90')}
            >
              Last 90 days
            </Button>
          </div>

          {/* Export Button */}
          <Button
            color="white"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-600">Total Views</Text>
            <div className="p-2 bg-blue-100 rounded-lg">
              <EyeIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          {overviewLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <Heading level={2} className="text-3xl font-bold text-gray-900">
                {overview?.totalViews?.toLocaleString() || '0'}
              </Heading>
              <Text className="text-sm text-gray-500 mt-1">
                Across all content types
              </Text>
            </>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-600">Unique Users</Text>
            <div className="p-2 bg-green-100 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-green-600" />
            </div>
          </div>
          {overviewLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <Heading level={2} className="text-3xl font-bold text-gray-900">
                {overview?.uniqueUsers?.toLocaleString() || '0'}
              </Heading>
              <Text className="text-sm text-gray-500 mt-1">
                Registered users viewing content
              </Text>
            </>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-600">Active Stations</Text>
            <div className="p-2 bg-purple-100 rounded-lg">
              <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          {overviewLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <Heading level={2} className="text-3xl font-bold text-gray-900">
                {overview?.activeStations || '0'}
              </Heading>
              <Text className="text-sm text-gray-500 mt-1">
                Stations accessing content
              </Text>
            </>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-600">Avg. Views/Day</Text>
            <div className="p-2 bg-orange-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          {overviewLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <Heading level={2} className="text-3xl font-bold text-gray-900">
                {Math.round(overview?.avgViewsPerDay || 0).toLocaleString()}
              </Heading>
              <Text className="text-sm text-gray-500 mt-1">
                Daily average for period
              </Text>
            </>
          )}
        </Card>
      </div>

      {/* Time-series Chart */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Heading level={2} className="text-xl font-semibold text-gray-900">
              Views Over Time
            </Heading>
            <Text className="text-sm text-gray-600 mt-1">
              Daily view counts for the selected period
            </Text>
          </div>
          <ChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>

        {timeSeriesLoading ? (
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        ) : timeSeries && timeSeries.length > 0 ? (
          <div className="h-64 flex items-end justify-between gap-1">
            {timeSeries.map((item: any, index: number) => {
              const maxViews = Math.max(...timeSeries.map((d: any) => d.views));
              const height = (item.views / maxViews) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative"
                    style={{ height: `${height}%` }}
                  >
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                      {format(new Date(item.date), 'MMM d')}: {item.views} views
                    </div>
                  </div>
                  {timeSeries.length <= 30 && index % 3 === 0 && (
                    <Text className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                      {format(new Date(item.date), 'MMM d')}
                    </Text>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <Text>No data available for this period</Text>
          </div>
        )}
      </Card>

      {/* Top Content and Station Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Viewed Content */}
        <Card className="p-6">
          <Heading level={2} className="text-xl font-semibold text-gray-900 mb-4">
            Most Viewed Content
          </Heading>

          {topContentLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : topContent && topContent.length > 0 ? (
            <div className="space-y-3">
              {topContent.map((item: any, index: number) => (
                <div
                  key={item.contentId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Text className="font-medium text-gray-900 truncate">
                          {item.content?.title || 'Unknown'}
                        </Text>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                            {item.contentType}
                          </span>
                          {item.content?.category && (
                            <Text className="text-xs text-gray-500">
                              {item.content.category.name}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <Text className="font-semibold text-gray-900">
                      {item.views.toLocaleString()}
                    </Text>
                    <Text className="text-xs text-gray-500">views</Text>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Text>No content data available</Text>
            </div>
          )}
        </Card>

        {/* Most Active Stations */}
        <Card className="p-6">
          <Heading level={2} className="text-xl font-semibold text-gray-900 mb-4">
            Most Active Stations
          </Heading>

          {stationActivityLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : stationActivity && stationActivity.length > 0 ? (
            <div className="space-y-3">
              {stationActivity.map((item: any, index: number) => (
                <div
                  key={item.station?.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Text className="font-medium text-gray-900 truncate">
                          {item.station?.name || 'Unknown'}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {item.station?.province} • {item.uniqueUsers} unique users
                        </Text>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <Text className="font-semibold text-gray-900">
                      {item.views.toLocaleString()}
                    </Text>
                    <Text className="text-xs text-gray-500">views</Text>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Text>No station data available</Text>
            </div>
          )}
        </Card>
      </div>
    </Container>
  );
}
