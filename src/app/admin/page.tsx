'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();

  const isSuperAdmin = session?.user?.staffRole === 'SUPERADMIN';

  // Simple admin stats - no API calls for now
  const adminStats = [
    {
      name: 'System Status',
      value: 'Online',
      description: 'All systems operational',
      change: 'Running smoothly',
      changeType: 'positive' as const,
    },
    {
      name: 'User Management',
      value: 'Active',
      description: 'User accounts and permissions',
    },
    {
      name: 'Radio Stations',
      value: 'Active', 
      description: 'Station management and content',
    },
    {
      name: 'Admin Functions',
      value: isSuperAdmin ? 'Full Access' : 'Standard Access',
      description: isSuperAdmin ? 'Super Administrator privileges' : 'Administrator privileges',
    },
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