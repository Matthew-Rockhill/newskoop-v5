'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useUserActivity } from '@/hooks/use-analytics';

const TIME_PERIODS = [
  { value: 1, label: 'Last 24 hours' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
];

export function UserActivityChart() {
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  
  const { data, isLoading, error } = useUserActivity(selectedPeriod);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-zinc-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="text-center text-red-600">
          <p>Failed to load activity data</p>
          <p className="text-sm text-zinc-500 mt-1">Please try again later</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  interface TooltipEntry {
    value: number;
    name: string;
    color: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: TooltipEntry) => sum + entry.value, 0);
      return (
        <div className="bg-white p-4 border border-zinc-200 rounded-lg shadow-lg">
          <p className="font-medium text-zinc-900 mb-2">{`Time: ${label}`}</p>
          {payload.map((entry: TooltipEntry, index: number) => (
            <div key={index} className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-zinc-700">{entry.name}:</span>
              </div>
              <span className="text-sm font-medium ml-2">{entry.value}</span>
            </div>
          ))}
          <div className="border-t border-zinc-200 mt-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-900">Total:</span>
              <span className="text-sm font-bold text-zinc-900">{total}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const peakHour = data.metadata.peakHour;

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-zinc-900">User Activity Timeline</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Active users by time of day - {selectedPeriod} day average
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="text-sm border border-zinc-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kelly-green focus:border-kelly-green"
          >
            {TIME_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Peak Activity Info */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">Peak Activity Period</p>
            <p className="text-lg font-semibold text-blue-700">{peakHour.time}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-600">Total Active Users</p>
            <p className="text-2xl font-bold text-zinc-900">{peakHour.total}</p>
            <p className="text-xs text-zinc-500">
              {peakHour.staffUsers} staff • {peakHour.radioUsers} radio
            </p>
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="h-96 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data.activityData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              fontSize={12}
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{ value: 'Active Users', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="staffUsers"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
              name="Staff Users"
            />
            <Line
              type="monotone"
              dataKey="radioUsers"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6, fill: '#047857' }}
              name="Radio Users"
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#6b7280' }}
              activeDot={{ r: 5, fill: '#374151' }}
              name="Total Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 pt-6 border-t border-zinc-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <p className="text-sm font-medium text-zinc-700">Staff Users</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {data.activityData.reduce((sum, item) => sum + item.staffUsers, 0)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Total Activity Points</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <p className="text-sm font-medium text-zinc-700">Radio Users</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {data.activityData.reduce((sum, item) => sum + item.radioUsers, 0)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Total Activity Points</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 bg-zinc-500 rounded-full mr-2"></div>
            <p className="text-sm font-medium text-zinc-700">Combined</p>
          </div>
          <p className="text-2xl font-bold text-zinc-900">
            {data.activityData.reduce((sum, item) => sum + item.total, 0)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Total Activity Points</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <p className="text-sm font-medium text-zinc-700">Peak Hour</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {peakHour.total}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Users at {peakHour.time}</p>
        </div>
      </div>
    </div>
  );
}