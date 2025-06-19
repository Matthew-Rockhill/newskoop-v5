import { Suspense } from 'react';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAuditLogs } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

async function getMetrics() {
  const [
    totalUsers,
    activeUsers,
    totalStations,
    activeStations,
    usersByType,
    usersByRole,
    stationsByProvince,
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
    prisma.station.groupBy({
      by: ['province'],
      _count: true,
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalStations,
    activeStations,
    usersByType,
    usersByRole,
    stationsByProvince,
  };
}

async function getRecentActivity() {
  const { logs } = await getAuditLogs({
    page: 1,
    perPage: 10,
  });

  return logs;
}

export const metadata = {
  title: 'Dashboard - Newskoop Admin',
};

export default async function AdminDashboard() {
  const metrics = await getMetrics();
  const recentActivity = await getRecentActivity();

  return (
    <Container>
      <div className="py-8 space-y-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <div className="mt-2 flex items-baseline">
                <p className="text-3xl font-semibold">{metrics.totalUsers}</p>
                <p className="ml-2 text-sm text-gray-500">
                  ({metrics.activeUsers} active)
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Stations</h3>
              <div className="mt-2 flex items-baseline">
                <p className="text-3xl font-semibold">{metrics.totalStations}</p>
                <p className="ml-2 text-sm text-gray-500">
                  ({metrics.activeStations} active)
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500">Users by Type</h3>
              <div className="mt-2 space-y-1">
                {metrics.usersByType.map((type) => (
                  <div key={type.userType} className="flex justify-between">
                    <span className="text-sm">{type.userType}</span>
                    <span className="text-sm font-medium">{type._count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500">Staff by Role</h3>
              <div className="mt-2 space-y-1">
                {metrics.usersByRole.map((role) => (
                  <div key={role.staffRole} className="flex justify-between">
                    <span className="text-sm">{role.staffRole}</span>
                    <span className="text-sm font-medium">{role._count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Stations by Province */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Stations by Province</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {metrics.stationsByProvince.map((province) => (
                <div key={province.province} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">{province.province}</span>
                  <Badge variant="secondary">{province._count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
            <Table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="text-sm">
                        <div>{log.user.name}</div>
                        <div className="text-gray-500">{log.user.email}</div>
                      </div>
                    </td>
                    <td>
                      <Badge variant="outline">
                        {log.action}
                      </Badge>
                    </td>
                    <td>
                      {log.targetType && (
                        <span className="text-sm">
                          {log.targetType}: {log.targetId}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      </div>
    </Container>
  );
} 