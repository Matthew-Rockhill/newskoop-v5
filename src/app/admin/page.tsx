import { Suspense } from 'react';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/ui/stats-card';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { getAuditLogs } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { 
  UsersIcon, 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

async function getMetrics() {
  const [
    totalUsers,
    activeUsers,
    totalStations,
    activeStations,
    usersByType,
    usersByRole,
    // Get previous month data for comparison
    previousMonthUsers,
    previousMonthStations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.station.count(),
    prisma.station.count({ where: { isActive: true } }),
    prisma.user.groupBy({
      by: ['userType'],
      _count: true,
    }),
    prisma.user.groupBy({
      by: ['staffRole'],
      _count: true,
      where: { userType: 'STAFF' },
    }),
    // Previous month comparison
    prisma.user.count({
      where: {
        createdAt: {
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.station.count({
      where: {
        createdAt: {
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  // Calculate growth percentages
  const userGrowth = previousMonthUsers > 0 
    ? (((totalUsers - previousMonthUsers) / previousMonthUsers) * 100).toFixed(1)
    : '0';
  
  const stationGrowth = previousMonthStations > 0 
    ? (((totalStations - previousMonthStations) / previousMonthStations) * 100).toFixed(1)
    : '0';

  const activeUserRate = totalUsers > 0 
    ? ((activeUsers / totalUsers) * 100).toFixed(1)
    : '0';

  const activeStationRate = totalStations > 0 
    ? ((activeStations / totalStations) * 100).toFixed(1)
    : '0';

  return {
    totalUsers,
    activeUsers,
    totalStations,
    activeStations,
    usersByType,
    usersByRole,
    userGrowth,
    stationGrowth,
    activeUserRate,
    activeStationRate,
  };
}

async function getRecentActivity() {
  const { logs } = await getAuditLogs({
    page: 1,
    perPage: 10,
  });

  return logs;
}

// Helper function to get activity icon and color
function getActivityIcon(action: string) {
  if (action.includes('create')) {
    return { icon: PlusIcon, color: 'bg-green-100', iconColor: 'text-green-600' };
  } else if (action.includes('update')) {
    return { icon: PencilIcon, color: 'bg-blue-100', iconColor: 'text-blue-600' };
  } else if (action.includes('delete')) {
    return { icon: TrashIcon, color: 'bg-red-100', iconColor: 'text-red-600' };
  } else if (action.includes('user')) {
    return { icon: UserPlusIcon, color: 'bg-purple-100', iconColor: 'text-purple-600' };
  } else {
    return { icon: Cog6ToothIcon, color: 'bg-gray-100', iconColor: 'text-gray-600' };
  }
}

// Helper function to format activity message
function formatActivityMessage(log: any) {
  const actionParts = log.action.split('.');
  const entity = actionParts[0]; // user, station, etc.
  const action = actionParts[1]; // create, update, delete

  switch (action) {
    case 'create':
      return `created a new ${entity}`;
    case 'update':
      return `updated ${entity} settings`;
    case 'delete':
      return `deleted a ${entity}`;
    default:
      return `performed ${action} on ${entity}`;
  }
}

// Helper function to get relative time
function getRelativeTime(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export const metadata = {
  title: 'Dashboard - Newskoop Admin',
};

export default async function AdminDashboard() {
  const metrics = await getMetrics();
  const recentActivity = await getRecentActivity();

  // Prepare stats for the StatsCard component
  const stats = [
    {
      name: 'Total Users',
      value: metrics.totalUsers,
      change: `+${metrics.userGrowth}%`,
      changeType: parseFloat(metrics.userGrowth) >= 0 ? 'positive' : 'negative' as const,
      description: `${metrics.activeUsers} active users`,
    },
    {
      name: 'Radio Stations',
      value: metrics.totalStations,
      change: `+${metrics.stationGrowth}%`,
      changeType: parseFloat(metrics.stationGrowth) >= 0 ? 'positive' : 'negative' as const,
      description: `${metrics.activeStations} active stations`,
    },
    {
      name: 'User Activity Rate',
      value: `${metrics.activeUserRate}%`,
      change: metrics.activeUserRate > '80' ? 'Excellent' : metrics.activeUserRate > '60' ? 'Good' : 'Needs attention',
      changeType: parseFloat(metrics.activeUserRate) > 80 ? 'positive' : parseFloat(metrics.activeUserRate) > 60 ? 'neutral' : 'negative' as const,
      description: 'Active vs total users',
    },
    {
      name: 'Station Coverage',
      value: `${metrics.activeStationRate}%`,
      change: metrics.activeStationRate > '85' ? 'Excellent' : metrics.activeStationRate > '70' ? 'Good' : 'Needs attention',
      changeType: parseFloat(metrics.activeStationRate) > 85 ? 'positive' : parseFloat(metrics.activeStationRate) > 70 ? 'neutral' : 'negative' as const,
      description: 'Active stations coverage',
    },
  ];

  return (
    <Container>
      <div className="py-8 space-y-8">
        {/* Header */}
        <PageHeader
          title="Dashboard"
        />
        <p className="text-sm text-gray-500 -mt-6">
          Overview of your Newskoop platform performance and key metrics.
        </p>

        {/* Key Metrics Stats Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Key Metrics</h2>
          <StatsCard stats={stats} />
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Distribution */}
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">User Distribution</h3>
              </div>
              <div className="mt-6 space-y-4">
                {metrics.usersByType.map((type) => (
                  <div key={type.userType} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {type.userType === 'STAFF' ? (
                        <UsersIcon className="h-4 w-4 text-blue-500 mr-2" />
                      ) : (
                        <BuildingOfficeIcon className="h-4 w-4 text-purple-500 mr-2" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {type.userType === 'STAFF' ? 'Staff Users' : 'Radio Station Users'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-gray-900 mr-2">{type._count}</span>
                      <Badge color={type.userType === 'STAFF' ? 'blue' : 'purple'}>
                        {((type._count / metrics.totalUsers) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Staff Roles */}
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Staff Roles</h3>
              </div>
              <div className="mt-6 space-y-3">
                {metrics.usersByRole.map((role) => (
                  <div key={role.staffRole} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {role.staffRole?.replace('_', ' ') || 'Unassigned'}
                    </span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(role._count / metrics.usersByType.find(t => t.userType === 'STAFF')?._count || 1) * 100}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">{role._count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity Feed - Full Width */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Recent Activity</h3>
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {recentActivity.map((activityItem, activityItemIdx) => {
                  const { icon: Icon, color, iconColor } = getActivityIcon(activityItem.action);
                  return (
                    <li key={activityItem.id}>
                      <div className="relative pb-8">
                        {activityItemIdx !== recentActivity.length - 1 ? (
                          <span 
                            aria-hidden="true" 
                            className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" 
                          />
                        ) : null}
                        <div className="relative flex items-start space-x-3">
                          <div>
                            <div className="relative px-1">
                              <div className={`flex size-8 items-center justify-center rounded-full ${color} ring-8 ring-white`}>
                                <Icon aria-hidden="true" className={`size-4 ${iconColor}`} />
                              </div>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 py-1.5">
                            <div className="text-sm text-gray-500">
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar 
                                  name={activityItem.user.name || activityItem.user.email}
                                  className="size-6"
                                />
                                <span className="font-medium text-gray-900">
                                  {activityItem.user.name || activityItem.user.email}
                                </span>
                              </div>
                              <div className="text-gray-600">
                                {formatActivityMessage(activityItem)}
                                {activityItem.targetType && (
                                  <span className="ml-1 text-gray-500">
                                    ({activityItem.targetType})
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {getRelativeTime(new Date(activityItem.createdAt))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Container>
  );
} 