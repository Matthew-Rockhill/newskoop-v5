'use client';

import { Checkbox, CheckboxField } from './checkbox';
import { Label } from './fieldset';
import clsx from 'clsx';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
  description?: string;
}

export interface BlockingChecklistProps {
  items: ChecklistItem[];
  values: Record<string, boolean>;
  onChange: (itemId: string, checked: boolean) => void;
  className?: string;
}

export function BlockingChecklist({
  items,
  values,
  onChange,
  className,
}: BlockingChecklistProps) {
  return (
    <div className={clsx('space-y-3', className)}>
      {items.map((item) => (
        <CheckboxField key={item.id} className="flex items-start gap-3">
          <Checkbox
            name={item.id}
            checked={values[item.id] || false}
            onChange={(checked) => onChange(item.id, checked)}
          />
          <div className="flex-1">
            <Label className="text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer">
              {item.label}
              {item.required && (
                <span className="ml-1 text-red-600 dark:text-red-400">*</span>
              )}
            </Label>
            {item.description && (
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {item.description}
              </p>
            )}
          </div>
        </CheckboxField>
      ))}
    </div>
  );
}
