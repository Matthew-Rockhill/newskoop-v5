import { Badge } from './badge';
import type { StoryStage } from '@prisma/client';
import { getStageColor } from '@/lib/color-system';

export interface StageBadgeProps {
  stage: StoryStage;
  className?: string;
}

const STAGE_LABELS: Record<StoryStage, string> = {
  DRAFT: 'Draft',
  NEEDS_JOURNALIST_REVIEW: 'Needs Review',
  NEEDS_SUB_EDITOR_APPROVAL: 'Needs Approval',
  APPROVED: 'Approved',
  TRANSLATED: 'Translated',
  PUBLISHED: 'Published',
};

export function StageBadge({ stage, className }: StageBadgeProps) {
  return (
    <Badge color={getStageColor(stage)} className={className}>
      {STAGE_LABELS[stage]}
    </Badge>
  );
}
