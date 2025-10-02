'use client';

import { useState } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from './dialog';
import { Button } from './button';
import { BlockingChecklist } from './blocking-checklist';
import { UserAssignmentSelect } from './user-assignment-select';
import type { StaffRole } from '@prisma/client';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
}

export interface StageTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StageTransitionData) => void | Promise<void>;
  title: string;
  description?: string;
  actionLabel: string;
  actionColor?: 'primary' | 'secondary' | 'success' | 'danger';
  checklistItems?: ChecklistItem[];
  requiresAssignment?: boolean;
  assignmentLabel?: string;
  assignmentRoles?: StaffRole[];
  users?: Array<{ id: string; firstName: string; lastName: string; staffRole: StaffRole }>;
  additionalFields?: React.ReactNode;
  isSubmitting?: boolean;
}

export interface StageTransitionData {
  checklistData?: Record<string, boolean>;
  assignedUserId?: string;
  [key: string]: any;
}

export function StageTransitionModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  actionLabel,
  actionColor = 'primary',
  checklistItems = [],
  requiresAssignment = false,
  assignmentLabel = 'Assign to:',
  assignmentRoles = [],
  users = [],
  additionalFields,
  isSubmitting = false,
}: StageTransitionModalProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    checklistItems.reduce((acc, item) => ({ ...acc, [item.id]: item.checked }), {})
  );
  const [assignedUserId, setAssignedUserId] = useState<string>('');
  const [additionalData, setAdditionalData] = useState<Record<string, any>>({});

  // Filter users by required roles
  const filteredUsers = assignmentRoles.length > 0
    ? users.filter(user => assignmentRoles.includes(user.staffRole))
    : users;

  // Check if all required items are checked
  const allRequiredChecked = checklistItems
    .filter(item => item.required)
    .every(item => checklist[item.id]);

  // Check if assignment is valid
  const isAssignmentValid = !requiresAssignment || assignedUserId !== '';

  // Can submit if all required items checked and assignment valid
  const canSubmit = allRequiredChecked && isAssignmentValid && !isSubmitting;

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    setChecklist(prev => ({ ...prev, [itemId]: checked }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const data: StageTransitionData = {
      checklistData: checklist,
      ...(requiresAssignment && { assignedUserId }),
      ...additionalData,
    };

    await onSubmit(data);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setChecklist(checklistItems.reduce((acc, item) => ({ ...acc, [item.id]: item.checked }), {}));
    setAssignedUserId('');
    setAdditionalData({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <DialogTitle>{title}</DialogTitle>

      {description && (
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </div>
      )}

      <DialogBody>
        <div className="space-y-6">
          {/* Checklist Section */}
          {checklistItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                {checklistItems.some(item => item.required) ? 'Required checklist:' : 'Checklist:'}
              </h4>
              <BlockingChecklist
                items={checklistItems}
                values={checklist}
                onChange={handleChecklistChange}
              />
            </div>
          )}

          {/* Divider if both checklist and assignment */}
          {checklistItems.length > 0 && requiresAssignment && (
            <div className="border-t border-zinc-200 dark:border-zinc-700" />
          )}

          {/* Assignment Section */}
          {requiresAssignment && (
            <div>
              <UserAssignmentSelect
                label={assignmentLabel}
                users={filteredUsers}
                value={assignedUserId}
                onChange={setAssignedUserId}
                required
              />
            </div>
          )}

          {/* Additional Fields */}
          {additionalFields && (
            <>
              {(checklistItems.length > 0 || requiresAssignment) && (
                <div className="border-t border-zinc-200 dark:border-zinc-700" />
              )}
              <div>{additionalFields}</div>
            </>
          )}
        </div>
      </DialogBody>

      <DialogActions>
        <Button color="white" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          color={actionColor}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? 'Processing...' : actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
