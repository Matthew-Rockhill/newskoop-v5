'use client';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { StageMetrics } from '@/lib/editorial-metrics';
import {
  DocumentTextIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { StoryStage } from '@prisma/client';

interface PipelineOverviewProps {
  metrics: StageMetrics[];
  isLoading?: boolean;
}

const STAGE_CONFIG: Record<
  StoryStage,
  {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
    bgColor: string;
  }
> = {
  DRAFT: {
    label: 'Draft',
    icon: DocumentTextIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  NEEDS_JOURNALIST_REVIEW: {
    label: 'Needs Review',
    icon: EyeIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  NEEDS_SUB_EDITOR_APPROVAL: {
    label: 'Needs Approval',
    icon: CheckCircleIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  TRANSLATED: {
    label: 'Translated',
    icon: DocumentTextIcon,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  PUBLISHED: {
    label: 'Published',
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

export function PipelineOverview({ metrics, isLoading }: PipelineOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <Heading level={2} className="text-xl font-semibold text-gray-900 mb-4">
        Editorial Pipeline
      </Heading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric) => {
          const config = STAGE_CONFIG[metric.stage];
          const Icon = config.icon;
          const hasAlert = metric.storiesExceedingSLA > 0;

          return (
            <Card
              key={metric.stage}
              className={`p-6 relative ${hasAlert ? 'ring-2 ring-red-500' : ''}`}
            >
              {/* Alert Badge */}
              {hasAlert && (
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    {metric.storiesExceedingSLA} overdue
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`inline-flex p-3 ${config.bgColor} rounded-lg mb-4`}>
                <Icon className={`h-6 w-6 ${config.color}`} />
              </div>

              {/* Stage Name */}
              <Text className="text-sm font-medium text-gray-600 mb-1">
                {config.label}
              </Text>

              {/* Count */}
              <Heading level={3} className="text-3xl font-bold text-gray-900 mb-3">
                {metric.count}
              </Heading>

              {/* Metrics */}
              <div className="space-y-2 border-t border-gray-200 pt-3">
                {metric.oldestStoryDays !== null && metric.count > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      Oldest:
                    </span>
                    <span
                      className={`font-medium ${
                        metric.oldestStoryDays > 3 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {metric.oldestStoryDays}d
                    </span>
                  </div>
                )}

                {metric.count > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Avg. time:</span>
                    <span className="font-medium text-gray-900">
                      {metric.averageDaysInStage}d
                    </span>
                  </div>
                )}

                {metric.count === 0 && (
                  <Text className="text-xs text-gray-400 italic">
                    No stories in this stage
                  </Text>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
