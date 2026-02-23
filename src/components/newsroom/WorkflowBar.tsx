'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  ForwardIcon,
} from '@heroicons/react/24/outline';
import { StoryStage, StaffRole } from '@prisma/client';
import clsx from 'clsx';

interface StageAction {
  action: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAssignment?: boolean;
  assignmentLabel?: string;
  assignmentRoles?: string[];
}

interface WorkflowBarProps {
  storyId: string;
  stage: StoryStage;
  authorRole?: StaffRole | null;
  assignedReviewer?: { firstName: string; lastName: string } | null;
  assignedApprover?: { firstName: string; lastName: string } | null;
  nextAction: StageAction | null;
  showRevisionButton: boolean;
  showMarkReadyToPublish?: boolean;
  showCreateTranslation?: boolean;
  showSkipTranslation?: boolean;
  showReviewForPublishing?: boolean;
  isTranslating?: boolean;
  onStageTransition: () => void;
  onRevisionRequest: () => void;
  onMarkReadyToPublish?: () => void;
  onCreateTranslation?: () => void;
  onSkipTranslation?: () => void;
  onReviewForPublishing?: () => void;
}

// Badge-style stage progress - exported for use in sidebar
export function StageProgressCard({
  currentStage,
  authorRole
}: {
  currentStage: StoryStage;
  authorRole?: StaffRole | null;
}) {
  const getWorkflowSteps = () => {
    const baseSteps = [
      { stage: 'DRAFT' as StoryStage, label: 'Draft', shortLabel: 'D' },
    ];

    if (authorRole === 'INTERN') {
      baseSteps.push({ stage: 'NEEDS_JOURNALIST_REVIEW' as StoryStage, label: 'Review', shortLabel: 'R' });
    }

    baseSteps.push(
      { stage: 'NEEDS_SUB_EDITOR_APPROVAL' as StoryStage, label: 'Approval', shortLabel: 'A' },
      { stage: 'TRANSLATED' as StoryStage, label: 'Translated', shortLabel: 'T' },
      { stage: 'PUBLISHED' as StoryStage, label: 'Published', shortLabel: 'P' },
    );

    return baseSteps;
  };

  const steps = getWorkflowSteps();
  const displayStage = currentStage === 'APPROVED' ? 'TRANSLATED' : currentStage;
  const currentStepIndex = steps.findIndex(step => step.stage === displayStage);

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex items-center flex-wrap gap-1">
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.stage} className="flex items-center">
            <div
              className={clsx(
                'px-2 py-1 text-xs font-medium rounded-md transition-all',
                {
                  'bg-emerald-100 text-emerald-700': status === 'completed',
                  'bg-purple-100 text-purple-700': status === 'current',
                  'bg-zinc-100 text-zinc-400': status === 'upcoming',
                }
              )}
              title={step.label}
            >
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.shortLabel}</span>
            </div>
            {!isLast && (
              <div
                className={clsx(
                  'w-3 h-px mx-0.5',
                  {
                    'bg-emerald-300': status === 'completed',
                    'bg-purple-300': status === 'current',
                    'bg-zinc-200': status === 'upcoming',
                  }
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WorkflowBar({
  nextAction,
  showRevisionButton,
  showMarkReadyToPublish,
  showCreateTranslation,
  showSkipTranslation,
  showReviewForPublishing,
  isTranslating,
  onStageTransition,
  onRevisionRequest,
  onMarkReadyToPublish,
  onCreateTranslation,
  onSkipTranslation,
  onReviewForPublishing,
}: WorkflowBarProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-zinc-200 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 mb-6">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Navigation */}
        <Button
          color="white"
          onClick={() => router.push('/newsroom/stories')}
          className="flex-shrink-0"
        >
          <ArrowLeftIcon className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Stories</span>
        </Button>

        {/* Right: Workflow Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Request Revision Button */}
          {showRevisionButton && (
            <Button
              color="white"
              onClick={onRevisionRequest}
              className="hidden sm:flex"
            >
              <ExclamationTriangleIcon className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Revision</span>
            </Button>
          )}

          {/* Next Stage Action Button */}
          {nextAction && (
            <Button
              color={nextAction.color as any}
              onClick={onStageTransition}
            >
              <nextAction.icon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{nextAction.label}</span>
            </Button>
          )}

          {/* Mark as Ready to Publish */}
          {showMarkReadyToPublish && onMarkReadyToPublish && (
            <Button
              color="primary"
              onClick={onMarkReadyToPublish}
            >
              <CheckCircleIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Ready to Publish</span>
            </Button>
          )}

          {/* Create Translation */}
          {showCreateTranslation && onCreateTranslation && (
            <Button
              color="secondary"
              onClick={onCreateTranslation}
              disabled={isTranslating}
            >
              <GlobeAltIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isTranslating ? 'Creating...' : 'Translate'}</span>
            </Button>
          )}

          {/* Skip Translation */}
          {showSkipTranslation && onSkipTranslation && (
            <Button
              color="white"
              onClick={onSkipTranslation}
            >
              <ForwardIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Skip Translation</span>
            </Button>
          )}

          {/* Review for Publishing */}
          {showReviewForPublishing && onReviewForPublishing && (
            <Button
              color="primary"
              onClick={onReviewForPublishing}
            >
              <CheckCircleIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Publish</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
