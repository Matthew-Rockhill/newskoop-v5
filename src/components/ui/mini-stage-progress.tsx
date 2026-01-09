import type { StoryStage, StaffRole } from '@prisma/client';
import clsx from 'clsx';

export interface MiniStageProgressProps {
  currentStage: StoryStage;
  authorRole?: StaffRole | null;
  className?: string;
  showLabel?: boolean;
}

interface Step {
  stage: StoryStage;
  label: string;
}

export function MiniStageProgress({
  currentStage,
  authorRole,
  className,
  showLabel = false
}: MiniStageProgressProps) {
  // Define workflow steps based on author role
  const getWorkflowSteps = (): Step[] => {
    const baseSteps: Step[] = [
      { stage: 'DRAFT', label: 'Draft' },
    ];

    // Interns go through journalist review
    if (authorRole === 'INTERN') {
      baseSteps.push(
        { stage: 'NEEDS_JOURNALIST_REVIEW', label: 'Review' },
      );
    }

    // Visual steps
    baseSteps.push(
      { stage: 'NEEDS_SUB_EDITOR_APPROVAL', label: 'Approval' },
      { stage: 'TRANSLATED', label: 'Translated' },
      { stage: 'PUBLISHED', label: 'Published' },
    );

    return baseSteps;
  };

  const steps = getWorkflowSteps();

  // Map stages to visual steps
  const displayStage = currentStage === 'APPROVED' ? 'TRANSLATED' : currentStage;
  const currentStepIndex = steps.findIndex(step => step.stage === displayStage);

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  // Get current stage label
  const getCurrentStageLabel = () => {
    if (currentStepIndex === -1) return 'Unknown';
    return steps[currentStepIndex].label;
  };

  return (
    <div className={clsx('flex items-center gap-1.5', className)} title={`Current stage: ${getCurrentStageLabel()}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(index);

        return (
          <div
            key={step.stage}
            className={clsx(
              'w-2 h-2 rounded-full transition-all',
              {
                'bg-kelly-green': status === 'completed',
                'bg-purple-500 ring-2 ring-purple-200 dark:ring-purple-900': status === 'current',
                'bg-zinc-300 dark:bg-zinc-600': status === 'upcoming',
              }
            )}
            title={step.label}
          />
        );
      })}
      {showLabel && (
        <span className="text-xs text-zinc-600 dark:text-zinc-400 ml-1">
          {getCurrentStageLabel()}
        </span>
      )}
    </div>
  );
}
