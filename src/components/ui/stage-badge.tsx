import { Badge } from './badge';
import type { StoryStage } from '@prisma/client';

export interface StageBadgeProps {
  stage: StoryStage;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const stageConfig: Record<
    StoryStage,
    { label: string; color: 'blue' | 'amber' | 'green' | 'purple' | 'zinc' }
  > = {
    DRAFT: {
      label: 'Draft',
      color: 'blue',
    },
    NEEDS_JOURNALIST_REVIEW: {
      label: 'Needs Review',
      color: 'amber',
    },
    NEEDS_SUB_EDITOR_APPROVAL: {
      label: 'Needs Approval',
      color: 'amber',
    },
    APPROVED: {
      label: 'Approved',
      color: 'green',
    },
    TRANSLATED: {
      label: 'Translated',
      color: 'blue',
    },
    PUBLISHED: {
      label: 'Published',
      color: 'purple',
    },
  };

  const config = stageConfig[stage];

  return (
    <Badge color={config.color} className={className}>
      {config.label}
    </Badge>
  );
}
