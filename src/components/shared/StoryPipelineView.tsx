import { useStories, type Story } from '@/hooks/use-stories';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { STAGE_COLORS } from '@/lib/color-system';
import clsx from 'clsx';
import {
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowRightIcon,
  PencilIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline';

type BadgeColor = "red" | "blue" | "cyan" | "fuchsia" | "green" | "indigo" | "lime" | "orange" | "pink" | "purple" | "teal" | "violet" | "yellow" | "amber" | "emerald" | "sky" | "rose" | "zinc";

// Static Tailwind class maps to avoid dynamic class generation issues
const stageStyles: Record<string, { bg: string; border: string; icon: string }> = {
  zinc: { bg: 'bg-zinc-50', border: 'border-zinc-200', icon: 'text-zinc-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-600' },
};

export function StoryPipelineView() {
  // Fetch stories in all stages of the editorial process
  const { data: draftData } = useStories({ status: 'DRAFT', page: 1, perPage: 1 });
  const { data: inReviewData } = useStories({ status: 'IN_REVIEW', page: 1, perPage: 1 });
  const { data: needsRevisionData } = useStories({ status: 'NEEDS_REVISION', page: 1, perPage: 1 });
  const { data: pendingApprovalData } = useStories({ status: 'PENDING_APPROVAL', page: 1, perPage: 1 });
  const { data: approvedData } = useStories({ status: 'APPROVED', page: 1, perPage: 1 });
  const { data: pendingTranslationData } = useStories({ status: 'PENDING_TRANSLATION', page: 1, perPage: 1 });
  const { data: readyToPublishData } = useStories({ status: 'READY_TO_PUBLISH', page: 1, perPage: 1 });
  const { data: publishedData } = useStories({ status: 'PUBLISHED', page: 1, perPage: 1 });

  const draftCount = draftData?.pagination?.total || 0;
  const inReviewCount = inReviewData?.pagination?.total || 0;
  const needsRevisionCount = needsRevisionData?.pagination?.total || 0;
  const pendingApprovalCount = pendingApprovalData?.pagination?.total || 0;
  const approvedCount = approvedData?.pagination?.total || 0;
  const pendingTranslationCount = pendingTranslationData?.pagination?.total || 0;
  const readyToPublishCount = readyToPublishData?.pagination?.total || 0;
  const publishedCount = publishedData?.pagination?.total || 0;

  const pipelineStages = [
    {
      name: 'Draft',
      icon: PencilIcon,
      color: STAGE_COLORS.DRAFT || 'zinc',
      count: draftCount,
    },
    {
      name: 'In Review',
      icon: ClockIcon,
      color: STAGE_COLORS.IN_REVIEW || 'amber',
      count: inReviewCount,
    },
    {
      name: 'Needs Revision',
      icon: ExclamationTriangleIcon,
      color: STAGE_COLORS.NEEDS_REVISION || 'red',
      count: needsRevisionCount,
    },
    {
      name: 'Pending Approval',
      icon: DocumentTextIcon,
      color: STAGE_COLORS.PENDING_APPROVAL || 'blue',
      count: pendingApprovalCount,
    },
    {
      name: 'Approved',
      icon: CheckCircleIcon,
      color: STAGE_COLORS.APPROVED || 'emerald',
      count: approvedCount,
    },
    {
      name: 'Pending Translation',
      icon: LanguageIcon,
      color: STAGE_COLORS.PENDING_TRANSLATION || 'purple',
      count: pendingTranslationCount,
    },
    {
      name: 'Ready to Publish',
      icon: CheckCircleIcon,
      color: STAGE_COLORS.READY_TO_PUBLISH || 'green',
      count: readyToPublishCount,
    },
    {
      name: 'Published',
      icon: EyeIcon,
      color: STAGE_COLORS.PUBLISHED || 'teal',
      count: publishedCount,
    }
  ];

  const totalInPipeline = draftCount + inReviewCount + needsRevisionCount + pendingApprovalCount + approvedCount + pendingTranslationCount + readyToPublishCount;
  const publishedToday = publishedData?.stories?.filter((story: Story) => {
    const today = new Date().toDateString();
    return new Date(story.publishedAt || story.updatedAt).toDateString() === today;
  }).length || 0;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Story Pipeline</h3>
        <Text className="text-zinc-600 dark:text-zinc-400">
          Complete overview of stories moving through the editorial process
        </Text>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {pipelineStages.map((stage, index) => {
          const styles = stageStyles[stage.color] || stageStyles.zinc;
          return (
            <div key={stage.name} className="relative">
              {/* Stage Card */}
              <div className={clsx(
                styles.bg,
                styles.border,
                'border rounded-lg p-4 text-center h-32 flex flex-col justify-center'
              )}>
                <div className="flex flex-col items-center space-y-2">
                  <stage.icon className={clsx('h-6 w-6', styles.icon)} aria-hidden="true" />
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{stage.name}</div>
                  <Badge color={stage.color as BadgeColor} className="text-lg font-bold">
                    {stage.count}
                  </Badge>
                </div>
              </div>

              {/* Arrow to next stage */}
              {index < pipelineStages.length - 1 && (
                <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 hidden lg:block">
                  <ArrowRightIcon className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pipeline Summary */}
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-zinc-600 dark:text-zinc-400 space-y-2 sm:space-y-0">
          <span>Total stories in pipeline: <strong>{totalInPipeline}</strong></span>
          <span>Published today: <strong>{publishedToday}</strong></span>
          <span>Total published: <strong>{publishedCount}</strong></span>
        </div>
      </div>
    </Card>
  );
}
