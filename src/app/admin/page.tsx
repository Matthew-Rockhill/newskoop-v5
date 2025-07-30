'use client';

import { useSession } from 'next-auth/react';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { useUsers } from '@/hooks/use-users';
import { UserActivityChart } from '@/components/admin/UserActivityChart';

export default function AdminDashboard() {
  const { data: session } = useSession();
  
  // Fetch data for admin stats
  const { users: allUsers, pagination: usersPagination } = useUsers({ page: 1, perPage: 100 });
  
  // This page is now only for admin users
  // Editorial staff are routed to /newsroom via the /dashboard router

  const isAdmin = session?.user?.staffRole && ['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole);
  const isSuperAdmin = session?.user?.staffRole === 'SUPERADMIN';

  // Admin stats (for SUPERADMIN and ADMIN only)
  const getAdminStats = () => {
    if (!isAdmin) return [];
    
    const totalUsers = usersPagination?.total || 0;
    const activeUserCount = usersPagination?.total || 0;
    const totalStations = 0; // TODO: Implement stations query
    const activeStationCount = 0; // TODO: Implement stations query
    
    // Count staff vs radio users from the actual data
    const staffUsers = (allUsers || []).filter(user => user.userType === 'STAFF').length;
    const radioUsers = (allUsers || []).filter(user => user.userType === 'RADIO').length;
    
    const activeUserPercentage = totalUsers > 0 ? Math.round((activeUserCount / totalUsers) * 100) : 0;
    const activeStationPercentage = totalStations > 0 ? Math.round((activeStationCount / totalStations) * 100) : 0;
    
    const userChangeType: 'positive' | 'neutral' | 'negative' = activeUserPercentage >= 80 ? 'positive' : activeUserPercentage >= 60 ? 'neutral' : 'negative';
    const stationChangeType: 'positive' | 'neutral' | 'negative' = activeStationPercentage >= 80 ? 'positive' : activeStationPercentage >= 60 ? 'neutral' : 'negative';
    
    return [
      {
        name: 'Total Users',
        value: totalUsers,
        description: `${activeUserCount} active users`,
        change: `${activeUserPercentage}% active`,
        changeType: userChangeType,
      },
      {
        name: 'Radio Stations',
        value: totalStations,
        description: `${activeStationCount} active stations`,
        change: `${activeStationPercentage}% active`,
        changeType: stationChangeType,
      },
      {
        name: 'Staff Users',
        value: staffUsers,
        description: 'Editorial and admin staff',
      },
      {
        name: 'Radio Users',
        value: radioUsers,
        description: 'Radio station personnel',
      },
    ];
  };

  // Newsroom stats - removed for simplicity
  const getNewsroomStats = () => {
    return [];
  };

  const adminStats = getAdminStats();
  const newsroomStats = getNewsroomStats();

  // Only show admin section - no more toggle
  const showAdminSection = isAdmin && adminStats.length > 0;
  const showNewsroomSection = false;
  const showToggle = false;

  return (
    <Container>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session?.user?.firstName || 'User'}!`}
      />

      <div className="mt-8">
        {/* Admin Section */}
        {showAdminSection && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">System Administration</h2>
              <StatsCard stats={adminStats} />
            </div>
            
            {/* User Activity Chart */}
            <div>
              <UserActivityChart />
            </div>
          </div>
        )}
      </div>
    </Container>
  );
} 