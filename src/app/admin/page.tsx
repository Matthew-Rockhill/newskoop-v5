'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { Button } from '@/components/ui/button';
import { useUsers } from '@/hooks/use-users';
import { useStories } from '@/hooks/use-stories';
import { UserActivityChart } from '@/components/admin/UserActivityChart';
import { UserDashboard } from '@/components/admin/InternDashboard';
import { 
  CogIcon, 
  NewspaperIcon,
} from '@heroicons/react/24/outline';

type DashboardSection = 'admin' | 'newsroom';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState<DashboardSection>('admin');
  
  // Fetch data for stats - get more data to show actual counts
  const { users: allUsers, pagination: usersPagination } = useUsers({ page: 1, perPage: 100 });
  
  // Newsroom stats
  const { data: allStoriesData } = useStories({ page: 1, perPage: 1 });
  const { data: draftStoriesData } = useStories({ status: 'DRAFT', page: 1, perPage: 1 });
  const { data: reviewStoriesData } = useStories({ status: 'IN_REVIEW', page: 1, perPage: 1 });
  const { data: publishedStoriesData } = useStories({ status: 'PUBLISHED', page: 1, perPage: 1 });
  
  // Role-based dashboard routing - after all hooks
  if (session?.user?.staffRole === 'INTERN' || session?.user?.staffRole === 'JOURNALIST' || session?.user?.staffRole === 'SUB_EDITOR') {
    return <UserDashboard />;
  }

  const isAdmin = session?.user?.staffRole && ['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole);
  const isEditorialStaff = session?.user?.staffRole && ['EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN'].includes(session.user.staffRole);

  // Admin stats (for SUPERADMIN and ADMIN only)
  const getAdminStats = () => {
    if (!isAdmin) return [];
    
    const totalUsers = usersPagination?.total || 0;
    const activeUserCount = usersPagination?.total || 0;
    const totalStations = allStations.filter(station => station.isActive).length;
    
    // Count staff vs radio users from the actual data
    const staffUsers = allUsers.filter(user => user.userType === 'STAFF').length;
    const radioUsers = allUsers.filter(user => user.userType === 'RADIO').length;
    
    const activeUserPercentage = totalUsers > 0 ? Math.round((activeUserCount / totalUsers) * 100) : 0;
    const activeStationPercentage = totalStations > 0 ? Math.round((activeStationCount / totalStations) * 100) : 0;
    
    return [
      {
        name: 'Total Users',
        value: totalUsers,
        description: `${activeUserCount} active users`,
        change: `${activeUserPercentage}% active`,
        changeType: activeUserPercentage >= 80 ? 'positive' : activeUserPercentage >= 60 ? 'neutral' : 'negative' as const,
      },
      {
        name: 'Radio Stations',
        value: totalStations,
        description: `${activeStationCount} active stations`,
        change: `${activeStationPercentage}% active`,
        changeType: activeStationPercentage >= 80 ? 'positive' : activeStationPercentage >= 60 ? 'neutral' : 'negative' as const,
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

  // Newsroom stats (for editorial staff)
  const getNewsroomStats = () => {
    if (!isEditorialStaff && !isAdmin) return [];
    
    return [
      {
        name: 'Total Stories',
        value: allStoriesData?.pagination?.total || 0,
        description: 'All stories in the system',
      },
      {
        name: 'Draft Stories',
        value: draftStoriesData?.pagination?.total || 0,
        description: 'Stories in draft status',
      },
      {
        name: 'In Review',
        value: reviewStoriesData?.pagination?.total || 0,
        description: 'Stories pending review',
      },
      {
        name: 'Published',
        value: publishedStoriesData?.pagination?.total || 0,
        description: 'Published stories',
      },
    ];
  };

  const adminStats = getAdminStats();
  const newsroomStats = getNewsroomStats();

  // Determine which sections to show
  const showAdminSection = isAdmin && adminStats.length > 0;
  const showNewsroomSection = (isEditorialStaff || isAdmin) && newsroomStats.length > 0;
  const showToggle = showAdminSection && showNewsroomSection;

  return (
    <Container>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session?.user?.firstName || 'User'}!`}
      />

      {/* Section Toggle - Only show if user has access to both sections */}
      {showToggle && (
        <div className="mt-8 flex gap-2">
          <Button
            onClick={() => setActiveSection('admin')}
            color={activeSection === 'admin' ? 'primary' : 'white'}
            className="text-sm"
          >
            <CogIcon className="size-4" />
            System Administration
          </Button>
          <Button
            onClick={() => setActiveSection('newsroom')}
            color={activeSection === 'newsroom' ? 'primary' : 'white'}
            className="text-sm"
          >
            <NewspaperIcon className="size-4" />
            Newsroom
          </Button>
        </div>
      )}

      <div className="mt-8">
        {/* Admin Section */}
        {showAdminSection && (!showToggle || activeSection === 'admin') && (
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

        {/* Newsroom Section */}
        {showNewsroomSection && (!showToggle || activeSection === 'newsroom') && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Newsroom Overview</h2>
              <StatsCard stats={newsroomStats} />
            </div>
          </div>
        )}
      </div>
    </Container>
  );
} 