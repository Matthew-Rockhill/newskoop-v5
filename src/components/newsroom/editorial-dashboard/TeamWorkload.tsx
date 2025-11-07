'use client';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { ReviewerWorkload } from '@/lib/editorial-metrics';
import { UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TeamWorkloadProps {
  journalists: ReviewerWorkload[];
  subEditors: ReviewerWorkload[];
  isLoading?: boolean;
}

function WorkloadBar({ value, max }: { value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  let colorClass = 'bg-green-500';
  if (percentage > 66) {
    colorClass = 'bg-red-500';
  } else if (percentage > 33) {
    colorClass = 'bg-yellow-500';
  }

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${colorClass} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  );
}

function WorkloadTable({
  title,
  workload,
  isLoading,
}: {
  title: string;
  workload: ReviewerWorkload[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded"></div>
        ))}
      </div>
    );
  }

  const maxLoad = Math.max(...workload.map((w) => w.storiesAssigned), 1);
  const totalStories = workload.reduce((sum, w) => sum + w.storiesAssigned, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Heading level={3} className="text-lg font-semibold text-gray-900">
          {title}
        </Heading>
        <Text className="text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{totalStories}</span> stories
        </Text>
      </div>

      {workload.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <Text className="text-sm">No team members in this role</Text>
        </div>
      ) : (
        <div className="space-y-3">
          {workload.map((member) => (
            <div
              key={member.userId}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Text className="font-medium text-gray-900">{member.name}</Text>
                  <Text className="text-sm text-gray-600">{member.email}</Text>
                </div>
                <div className="text-right">
                  <Text className="text-2xl font-bold text-gray-900">
                    {member.storiesAssigned}
                  </Text>
                  <Text className="text-xs text-gray-500">assigned</Text>
                </div>
              </div>

              {/* Workload Bar */}
              <div className="mb-2">
                <WorkloadBar value={member.storiesAssigned} max={maxLoad} />
              </div>

              {/* Oldest Story */}
              {member.oldestAssignedDays !== null && member.storiesAssigned > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <Text className="text-gray-600">
                    Oldest story:{' '}
                    <span
                      className={`font-medium ${
                        member.oldestAssignedDays > 3
                          ? 'text-red-600'
                          : member.oldestAssignedDays > 1
                          ? 'text-yellow-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {member.oldestAssignedDays}d
                    </span>
                  </Text>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamWorkload({ journalists, subEditors, isLoading }: TeamWorkloadProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <UserGroupIcon className="h-6 w-6 text-gray-600" />
        <Heading level={2} className="text-xl font-semibold text-gray-900">
          Team Workload
        </Heading>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <WorkloadTable
          title="Journalists (Tier 1 Review)"
          workload={journalists}
          isLoading={isLoading}
        />
        <WorkloadTable
          title="Sub-Editors (Tier 2 Approval)"
          workload={subEditors}
          isLoading={isLoading}
        />
      </div>
    </Card>
  );
}
