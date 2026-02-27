'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

import { Container } from '@/components/ui/container';
import { StatsCard } from '@/components/ui/stats-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { PageHeader } from '@/components/ui/page-header';
import {
  UsersIcon,
  RadioIcon,
  CogIcon,
  PlusIcon,
  EyeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface DashboardStats {
  users: { total: number; staff: number; radio: number };
  stations: { active: number; total: number };
  publishedThisWeek: number;
  contentViews30d: number;
  recentActivity: AuditLogEntry[];
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    'auth.login': 'Logged in',
    'auth.login.failed': 'Failed login',
    'auth.logout': 'Logged out',
    'auth.password.reset.request': 'Password reset requested',
    'auth.password.reset': 'Password reset',
    'auth.password.change': 'Password changed',
    'user.create': 'User created',
    'user.update': 'User updated',
    'user.delete': 'User deleted',
    'user.activate': 'User activated',
    'user.deactivate': 'User deactivated',
    'station.create': 'Station created',
    'station.update': 'Station updated',
    'station.delete': 'Station deleted',
    'station.activate': 'Station activated',
    'station.deactivate': 'Station deactivated',
    'content.create': 'Content created',
    'content.update': 'Content updated',
    'content.delete': 'Content deleted',
    'content.publish': 'Content published',
    'content.unpublish': 'Content unpublished',
  };
  return labels[action] || action;
}

function getActionColor(action: string): 'blue' | 'green' | 'red' | 'yellow' | 'zinc' {
  if (action.startsWith('auth.login.failed')) return 'red';
  if (action.startsWith('auth')) return 'blue';
  if (action.includes('delete') || action.includes('deactivate')) return 'red';
  if (action.includes('create') || action.includes('activate') || action.includes('publish')) return 'green';
  return 'zinc';
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();

  const isSuperAdmin = session?.user?.staffRole === 'SUPERADMIN';

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard-stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
  });

  const adminStats = stats
    ? [
        {
          name: 'Total Users',
          value: stats.users.total,
          description: `${stats.users.staff} staff, ${stats.users.radio} radio`,
        },
        {
          name: 'Active Stations',
          value: stats.stations.active,
          description: `of ${stats.stations.total} total stations`,
          change: stats.stations.total > 0
            ? `${Math.round((stats.stations.active / stats.stations.total) * 100)}% active`
            : undefined,
          changeType: 'positive' as const,
        },
        {
          name: 'Published This Week',
          value: stats.publishedThisWeek,
          description: 'Stories published since Monday',
        },
        {
          name: 'Content Views (30d)',
          value: stats.contentViews30d,
          description: 'Total views in the last 30 days',
        },
      ]
    : [
        { name: 'Total Users', value: isLoading ? '...' : '0', description: 'Loading...' },
        { name: 'Active Stations', value: isLoading ? '...' : '0', description: 'Loading...' },
        { name: 'Published This Week', value: isLoading ? '...' : '0', description: 'Loading...' },
        { name: 'Content Views (30d)', value: isLoading ? '...' : '0', description: 'Loading...' },
      ];

  return (
    <Container>
      <PageHeader
        title="Admin Dashboard"
        description={`Welcome back, ${session?.user?.firstName || 'Administrator'}! System administration and management portal.`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              color="white"
              onClick={() => router.push('/admin/users')}
            >
              <UsersIcon className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button
              color="white"
              onClick={() => router.push('/admin/stations')}
            >
              <RadioIcon className="h-4 w-4 mr-2" />
              Manage Stations
            </Button>
          </div>
        }
      />

      {/* Admin Stats */}
      <div className="mt-8">
        <StatsCard stats={adminStats} />
      </div>

      {/* Recent Activity Feed */}
      <div className="mt-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-zinc-400" />
              <Heading level={3}>Recent Activity</Heading>
            </div>
            <Button
              color="white"
              onClick={() => router.push('/admin/audit-logs')}
            >
              View All
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-zinc-100 rounded animate-pulse" />
              ))}
            </div>
          ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {stats.recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge color={getActionColor(entry.action)} className="flex-shrink-0">
                      {formatAction(entry.action)}
                    </Badge>
                    <Text className="text-sm text-zinc-700 truncate">
                      {entry.user.name}
                    </Text>
                  </div>
                  <Text className="text-xs text-zinc-400 flex-shrink-0 ml-3">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </Text>
                </div>
              ))}
            </div>
          ) : (
            <Text className="text-sm text-zinc-500 text-center py-4">No recent activity</Text>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Management */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3}>User Management</Heading>
            <Badge color="blue">Active</Badge>
          </div>
          <Text className="text-zinc-600 mb-4">
            Manage user accounts, roles, and permissions
          </Text>

          <div className="space-y-3">
            <Button
              color="white"
              className="w-full justify-start"
              onClick={() => router.push('/admin/users')}
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View All Users
            </Button>
            <Button
              color="white"
              className="w-full justify-start"
              onClick={() => router.push('/admin/users/new')}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New User
            </Button>
          </div>
        </Card>

        {/* Station Management */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3}>Radio Station Management</Heading>
            <Badge color="green">Active</Badge>
          </div>
          <Text className="text-zinc-600 mb-4">
            Manage radio stations and their configurations
          </Text>

          <div className="space-y-3">
            <Button
              color="white"
              className="w-full justify-start"
              onClick={() => router.push('/admin/stations')}
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View All Stations
            </Button>
            <Button
              color="white"
              className="w-full justify-start"
              onClick={() => router.push('/admin/stations/new')}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Station
            </Button>
          </div>
        </Card>
      </div>

      {/* SUPERADMIN Only Section */}
      {isSuperAdmin && (
        <div className="mt-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3}>Super Administrator Tools</Heading>
              <Badge color="red">Super Admin</Badge>
            </div>
            <Text className="text-zinc-600 mb-4">
              Advanced system administration and oversight functions
            </Text>

            <div className="space-y-3">
              <Button
                color="white"
                className="w-full justify-start"
                onClick={() => router.push('/newsroom')}
              >
                <CogIcon className="h-4 w-4 mr-2" />
                Access Newsroom (Editorial Oversight)
              </Button>
              <Text className="text-sm text-zinc-500">
                As SUPERADMIN, you can access the newsroom for editorial oversight and system-wide management.
              </Text>
            </div>
          </Card>
        </div>
      )}
    </Container>
  );
}
