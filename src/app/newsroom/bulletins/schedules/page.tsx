'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlusIcon,
  ClockIcon,
  CalendarIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { BulletinScheduleManager } from '@/components/newsroom/bulletins/BulletinScheduleManager';

interface BulletinSchedule {
  id: string;
  title: string;
  time: string;
  language: 'ENGLISH' | 'AFRIKAANS' | 'XHOSA';
  scheduleType: 'WEEKDAY' | 'WEEKEND' | 'PUBLIC_HOLIDAY';
  isActive: boolean;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    bulletins: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function BulletinSchedulesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BulletinSchedule | null>(null);
  const [activeTab, setActiveTab] = useState<'WEEKDAY' | 'WEEKEND' | 'PUBLIC_HOLIDAY'>('WEEKDAY');

  const isEditor = session?.user?.staffRole && ['EDITOR', 'SUPERADMIN', 'ADMIN'].includes(session.user.staffRole);

  // Fetch schedules
  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ['bulletin-schedules', activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/bulletins/schedules?type=${activeTab}`);
      if (!response.ok) throw new Error('Failed to fetch schedules');
      return response.json();
    },
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/bulletins/schedules/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete schedule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-schedules'] });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/newsroom/bulletins/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) throw new Error('Failed to update schedule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-schedules'] });
    },
  });

  const schedules: BulletinSchedule[] = schedulesData?.schedules || [];

  const handleDelete = async (schedule: BulletinSchedule) => {
    if (schedule._count.bulletins > 0) {
      alert(`Cannot delete schedule "${schedule.title}" because it has ${schedule._count.bulletins} associated bulletins.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete the schedule "${schedule.title}"?`)) {
      try {
        await deleteMutation.mutateAsync(schedule.id);
      } catch (_error) {
        alert('Failed to delete schedule');
      }
    }
  };

  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'ENGLISH': return 'blue';
      case 'AFRIKAANS': return 'green';
      case 'XHOSA': return 'purple';
      default: return 'zinc';
    }
  };

  const tabs = [
    { id: 'WEEKDAY' as const, label: 'Weekdays', icon: CalendarIcon },
    { id: 'WEEKEND' as const, label: 'Weekends', icon: CalendarIcon },
    { id: 'PUBLIC_HOLIDAY' as const, label: 'Public Holidays', icon: CalendarIcon },
  ];

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Heading level={1} className="text-3xl font-bold text-zinc-900">
            Bulletin Schedules
          </Heading>
          <Text className="text-zinc-600 mt-2">
            Manage the schedule for news bulletins across different days and languages
          </Text>
        </div>
        
        {isEditor && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-kelly-green hover:bg-kelly-green/90 text-white flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Schedule
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <Card className="mb-6">
        <div className="border-b border-zinc-200">
          <nav className="-mb-px flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-kelly-green text-kelly-green'
                      : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </Card>

      {/* Schedules List */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
          <Text className="mt-2 text-zinc-600">Loading schedules...</Text>
        </Card>
      ) : schedules.length === 0 ? (
        <Card className="p-8 text-center">
          <ClockIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <Heading level={3} className="text-lg font-semibold text-zinc-900 mb-2">
            No schedules yet
          </Heading>
          <Text className="text-zinc-600 mb-4">
            Create your first bulletin schedule for {activeTab.toLowerCase().replace('_', ' ')}s
          </Text>
          {isEditor && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-kelly-green hover:bg-kelly-green/90 text-white"
            >
              Create Schedule
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <ClockIcon className="h-8 w-8 text-zinc-400 mt-1" />
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Heading level={3} className="text-lg font-semibold text-zinc-900">
                        {schedule.title}
                      </Heading>
                      <Badge color={getLanguageColor(schedule.language)}>
                        {schedule.language}
                      </Badge>
                      <Badge color={schedule.isActive ? 'green' : 'red'}>
                        {schedule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-600">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {schedule.time}
                      </span>
                      <span>•</span>
                      <span>{schedule._count.bulletins} bulletins</span>
                      <span>•</span>
                      <span>Created by {schedule.creator.firstName} {schedule.creator.lastName}</span>
                    </div>
                  </div>
                </div>

                {isEditor && (
                  <div className="flex items-center gap-2">
                    <Button
                      outline
                      onClick={() => toggleActiveMutation.mutate({ id: schedule.id, isActive: schedule.isActive })}
                      className="flex items-center gap-1"
                    >
                      {schedule.isActive ? (
                        <>
                          <XCircleIcon className="h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      outline
                      onClick={() => setEditingSchedule(schedule)}
                      className="flex items-center gap-1"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      outline
                      onClick={() => handleDelete(schedule)}
                      disabled={schedule._count.bulletins > 0}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingSchedule) && (
        <BulletinScheduleManager
          schedule={editingSchedule}
          defaultType={activeTab}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSchedule(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['bulletin-schedules'] });
            setShowCreateModal(false);
            setEditingSchedule(null);
          }}
        />
      )}
    </Container>
  );
}