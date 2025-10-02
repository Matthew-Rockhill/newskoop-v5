import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { StaffRole } from '@prisma/client';
import clsx from 'clsx';

export interface RevisionRequest {
  id: string;
  reason: string;
  createdAt: Date;
  requestedBy: {
    firstName: string;
    lastName: string;
    staffRole: StaffRole;
  };
  requestedByRole: StaffRole;
}

export interface RevisionRequestBannerProps {
  revisionRequests: RevisionRequest[];
  className?: string;
}

export function RevisionRequestBanner({
  revisionRequests,
  className,
}: RevisionRequestBannerProps) {
  if (revisionRequests.length === 0) return null;

  // Show the most recent revision request
  const latestRevision = revisionRequests[0];

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

  const getTimeAgo = (date: Date): string => {
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

  return (
    <div
      className={clsx(
        className,
        'rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30'
      )}
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Revision Requested
          </h3>
          <div className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">
              {latestRevision.requestedBy.firstName} {latestRevision.requestedBy.lastName} (
              {getRoleLabel(latestRevision.requestedBy.staffRole)})
            </p>
            <p className="mt-1">"{latestRevision.reason}"</p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Requested {getTimeAgo(latestRevision.createdAt)}
            </p>
          </div>
          {revisionRequests.length > 1 && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              +{revisionRequests.length - 1} more revision request
              {revisionRequests.length - 1 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
