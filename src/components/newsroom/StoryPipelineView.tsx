import { useStories, type Story } from '@/hooks/use-stories';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
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
      color: 'zinc',
      count: draftCount,
    },
    {
      name: 'In Review',
      icon: ClockIcon,
      color: 'yellow',
      count: inReviewCount,
    },
    {
      name: 'Needs Revision',
      icon: ExclamationTriangleIcon,
      color: 'red',
      count: needsRevisionCount,
    },
    {
      name: 'Pending Approval',
      icon: DocumentTextIcon,
      color: 'blue',
      count: pendingApprovalCount,
    },
    {
      name: 'Approved',
      icon: CheckCircleIcon,
      color: 'green',
      count: approvedCount,
    },
    {
      name: 'Pending Translation',
      icon: LanguageIcon,
      color: 'purple',
      count: pendingTranslationCount,
    },
    {
      name: 'Ready to Publish',
      icon: CheckCircleIcon,
      color: 'emerald',
      count: readyToPublishCount,
    },
    {
      name: 'Published',
      icon: EyeIcon,
      color: 'purple',
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Story Pipeline</h3>
        <Text className="text-gray-600">
          Complete overview of stories moving through the editorial process
        </Text>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {pipelineStages.map((stage, index) => (
          <div key={stage.name} className="relative">
            {/* Stage Card */}
            <div className={`bg-${stage.color}-50 border border-${stage.color}-200 rounded-lg p-4 text-center h-32 flex flex-col justify-center`}>
              <div className="flex flex-col items-center space-y-2">
                <stage.icon className={`h-6 w-6 text-${stage.color}-600`} />
                <div className="text-sm font-medium text-gray-900">{stage.name}</div>
                <Badge color={stage.color as BadgeColor} className="text-lg font-bold">
                  {stage.count}
                </Badge>
              </div>
            </div>

            {/* Arrow to next stage */}
            {index < pipelineStages.length - 1 && (
              <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 hidden lg:block">
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pipeline Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 space-y-2 sm:space-y-0">
          <span>Total stories in pipeline: <strong>{totalInPipeline}</strong></span>
          <span>Published today: <strong>{publishedToday}</strong></span>
          <span>Total published: <strong>{publishedCount}</strong></span>
        </div>
      </div>
    </Card>
  );
} 