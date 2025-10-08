import { EyeIcon } from '@heroicons/react/24/outline';
import type { StaffRole, StoryStage } from '@prisma/client';
import clsx from 'clsx';

export interface Reviewer {
  firstName: string;
  lastName: string;
  staffRole: StaffRole;
}

export interface ReviewStatusBannerProps {
  stage: StoryStage;
  reviewer: Reviewer;
  updatedAt: string | Date;
  className?: string;
}

export function ReviewStatusBanner({
  stage,
  reviewer,
  updatedAt,
  className,
}: ReviewStatusBannerProps) {
  const getRoleLabel = (role: StaffRole): string => {
    const roleLabels: Record<StaffRole, string> = {
      INTERN: 'Intern',
      JOURNALIST: 'Journalist',
      SUB_EDITOR: 'Sub-Editor',
      EDITOR: 'Editor',
      ADMIN: 'Admin',
      SUPERADMIN: 'Superadmin',
    };
    return roleLabels[role] || role;
  };

  const getTimeAgo = (date: string | Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getMessage = (): string => {
    if (stage === 'NEEDS_JOURNALIST_REVIEW') {
      return 'Your story is being reviewed';
    }
    if (stage === 'NEEDS_SUB_EDITOR_APPROVAL') {
      return 'Your story is awaiting approval';
    }
    return 'Your story is under review';
  };

  return (
    <div
      className={clsx(
        className,
        'rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <EyeIcon className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              {getMessage()}
            </h3>
            <div className="mt-2 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">
                {reviewer.firstName} {reviewer.lastName} ({getRoleLabel(reviewer.staffRole)})
              </p>
            </div>
          </div>
        </div>
        <div className="text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap">
          {getTimeAgo(updatedAt)}
        </div>
      </div>
    </div>
  );
}
