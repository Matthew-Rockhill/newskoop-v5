import { CheckIcon } from '@heroicons/react/24/solid';
import type { StoryStage, StaffRole } from '@prisma/client';
import clsx from 'clsx';

export interface StageProgressProps {
  currentStage: StoryStage;
  authorRole: StaffRole;
  className?: string;
}

interface Step {
  stage: StoryStage;
  label: string;
  shortLabel: string;
}

export function StageProgress({ currentStage, authorRole, className }: StageProgressProps) {
  // Define workflow steps based on author role
  const getWorkflowSteps = (): Step[] => {
    const baseSteps: Step[] = [
      { stage: 'DRAFT', label: 'Draft', shortLabel: 'Draft' },
    ];

    // Interns go through journalist review
    if (authorRole === 'INTERN') {
      baseSteps.push(
        { stage: 'NEEDS_JOURNALIST_REVIEW', label: 'Review', shortLabel: 'Review' },
      );
    }

    // Visual steps - note: NEEDS_SUB_EDITOR_APPROVAL maps to Approval step
    baseSteps.push(
      { stage: 'NEEDS_SUB_EDITOR_APPROVAL', label: 'Approval', shortLabel: 'Approval' },
      { stage: 'TRANSLATED', label: 'Translated', shortLabel: 'Translated' },
      { stage: 'PUBLISHED', label: 'Published', shortLabel: 'Published' },
    );

    return baseSteps;
  };

  const steps = getWorkflowSteps();

  // Map stages to visual steps:
  // - NEEDS_SUB_EDITOR_APPROVAL shows at "Approval" step (current)
  // - APPROVED shows at "Translated" step (making Approval completed)
  const displayStage = currentStage === 'APPROVED' ? 'TRANSLATED' : currentStage;
  const currentStepIndex = steps.findIndex(step => step.stage === displayStage);

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className={clsx('w-full', className)}>
      {/* Desktop: Horizontal stepper */}
      <div className="hidden md:flex items-center justify-between px-4">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.stage} className="flex items-center flex-1">
              {/* Step */}
              <div className="flex flex-col items-center">
                {/* Circle indicator */}
                <div
                  className={clsx(
                    'flex items-center justify-center rounded-full transition-all',
                    {
                      // Completed
                      'w-10 h-10 bg-kelly-green text-white': status === 'completed',
                      // Current
                      'w-12 h-12 bg-purple-500 text-white ring-4 ring-purple-200 dark:ring-purple-900': status === 'current',
                      // Upcoming
                      'w-10 h-10 border-2 border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500': status === 'upcoming',
                    }
                  )}
                >
                  {status === 'completed' ? (
                    <CheckIcon className="h-6 w-6" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <p
                    className={clsx(
                      'text-xs font-medium',
                      {
                        'text-kelly-green dark:text-kelly-green': status === 'completed',
                        'text-purple-600 dark:text-purple-400': status === 'current',
                        'text-zinc-500 dark:text-zinc-400': status === 'upcoming',
                      }
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={clsx(
                    'flex-1 h-1 mx-4 rounded transition-all',
                    {
                      'bg-kelly-green': status === 'completed',
                      'bg-gradient-to-r from-purple-500 to-zinc-300 dark:to-zinc-600': status === 'current',
                      'bg-zinc-300 dark:bg-zinc-600': status === 'upcoming',
                    }
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Vertical stepper */}
      <div className="md:hidden space-y-4 px-4">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.stage} className="flex items-start">
              {/* Left side: Circle and line */}
              <div className="flex flex-col items-center mr-4">
                {/* Circle indicator */}
                <div
                  className={clsx(
                    'flex items-center justify-center rounded-full transition-all flex-shrink-0',
                    {
                      // Completed
                      'w-8 h-8 bg-kelly-green text-white': status === 'completed',
                      // Current
                      'w-10 h-10 bg-purple-500 text-white ring-4 ring-purple-200 dark:ring-purple-900': status === 'current',
                      // Upcoming
                      'w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500': status === 'upcoming',
                    }
                  )}
                >
                  {status === 'completed' ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={clsx(
                      'w-1 flex-1 mt-2 rounded transition-all',
                      'min-h-[40px]',
                      {
                        'bg-kelly-green': status === 'completed',
                        'bg-gradient-to-b from-purple-500 to-zinc-300 dark:to-zinc-600': status === 'current',
                        'bg-zinc-300 dark:bg-zinc-600': status === 'upcoming',
                      }
                    )}
                  />
                )}
              </div>

              {/* Right side: Label */}
              <div className="pt-1">
                <p
                  className={clsx(
                    'text-sm font-medium',
                    {
                      'text-kelly-green dark:text-kelly-green': status === 'completed',
                      'text-purple-600 dark:text-purple-400': status === 'current',
                      'text-zinc-500 dark:text-zinc-400': status === 'upcoming',
                    }
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
