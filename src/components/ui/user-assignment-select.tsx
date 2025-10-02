'use client';

import { Field, Label } from './fieldset';
import { Select } from './select';
import type { StaffRole } from '@prisma/client';

export interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  staffRole: StaffRole;
}

export interface UserAssignmentSelectProps {
  label: string;
  users: UserOption[];
  value: string;
  onChange: (userId: string) => void;
  required?: boolean;
  description?: string;
  placeholder?: string;
  className?: string;
}

export function UserAssignmentSelect({
  label,
  users,
  value,
  onChange,
  required = false,
  description,
  placeholder = 'Select user...',
  className,
}: UserAssignmentSelectProps) {
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

  return (
    <Field className={className}>
      <Label>
        {label}
        {required && <span className="ml-1 text-red-600 dark:text-red-400">*</span>}
      </Label>
      {description && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      )}
      <Select
        name="assignedUserId"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="">{placeholder}</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.firstName} {user.lastName} ({getRoleLabel(user.staffRole)})
          </option>
        ))}
      </Select>
    </Field>
  );
}
