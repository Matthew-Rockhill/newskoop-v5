'use client'

import clsx from 'clsx'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { Button } from '../button'
import type { BulkAction } from './types'

interface DataListBulkActionsProps {
  selectedCount: number
  totalCount: number
  actions: BulkAction[]
  selectedIds: string[]
  onClearSelection: () => void
}

export function DataListBulkActions({
  selectedCount,
  totalCount,
  actions,
  selectedIds,
  onClearSelection,
}: DataListBulkActionsProps) {
  if (selectedCount === 0) return null

  const handleAction = async (action: BulkAction) => {
    if (action.confirmMessage) {
      const confirmed = window.confirm(action.confirmMessage)
      if (!confirmed) return
    }

    await action.onAction(selectedIds)
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-kelly-green/10 px-4 py-3 dark:bg-kelly-green/20">
      <div className="flex items-center gap-4">
        {/* Selection count */}
        <span className="text-sm font-medium text-zinc-900 dark:text-white">
          {selectedCount} of {totalCount} selected
        </span>

        {/* Divider */}
        <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden="true" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.key}
              onClick={() => handleAction(action)}
              disabled={action.disabled}
              className={clsx(
                'text-sm',
                action.destructive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-kelly-green text-white hover:bg-kelly-green/90'
              )}
            >
              {action.icon && (
                <action.icon className="-ml-0.5 mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Clear selection */}
      <Button
        plain
        onClick={onClearSelection}
        className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        aria-label="Clear selection"
      >
        <XMarkIcon className="h-5 w-5" />
        <span className="ml-1 hidden sm:inline">Clear</span>
      </Button>
    </div>
  )
}
