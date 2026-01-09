'use client'

import type React from 'react'
import clsx from 'clsx'
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid'
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from '../dropdown'
import type { RowAction } from './types'

interface DataListActionsProps<T> {
  item: T
  actions: RowAction<T>[]
}

export function DataListActions<T>({ item, actions }: DataListActionsProps<T>) {
  // Filter out hidden actions
  const visibleActions = actions.filter((action) => !action.isHidden?.(item))

  if (visibleActions.length === 0) return null

  // Show inline icon buttons for 1-2 actions on desktop, dropdown on mobile
  if (visibleActions.length <= 2) {
    return (
      <div className="flex items-center justify-end gap-1">
        {/* Desktop: inline icon buttons */}
        <div className="hidden sm:flex sm:items-center sm:gap-1">
          {visibleActions.map((action) => {
            const isDisabled = action.isDisabled?.(item)
            const href = action.href?.(item)
            const Icon = action.icon

            const buttonClass = clsx(
              'rounded-md p-1.5 transition-colors',
              isDisabled
                ? 'cursor-not-allowed text-zinc-300 dark:text-zinc-600'
                : action.destructive
                  ? 'text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
                  : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300'
            )

            if (href && !isDisabled) {
              return (
                <a
                  key={action.key}
                  href={href}
                  className={buttonClass}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  title={action.label}
                  aria-label={action.label}
                >
                  {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
                </a>
              )
            }

            return (
              <button
                key={action.key}
                type="button"
                disabled={isDisabled}
                className={buttonClass}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  if (!isDisabled) action.onAction(item)
                }}
                title={action.label}
                aria-label={action.label}
              >
                {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        {/* Mobile: dropdown */}
        <div className="sm:hidden">
          <ActionDropdown item={item} actions={visibleActions} />
        </div>
      </div>
    )
  }

  // Show dropdown for 3+ actions
  return <ActionDropdown item={item} actions={visibleActions} />
}

interface ActionDropdownProps<T> {
  item: T
  actions: RowAction<T>[]
}

function ActionDropdown<T>({ item, actions }: ActionDropdownProps<T>) {
  return (
    <Dropdown>
      <DropdownButton
        plain
        aria-label="Row actions"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-zinc-500" />
      </DropdownButton>

      <DropdownMenu anchor="bottom end">
        {actions.map((action) => {
          const isDisabled = action.isDisabled?.(item)
          const href = action.href?.(item)

          if (href && !isDisabled) {
            return (
              <DropdownItem
                key={action.key}
                href={href}
                className={clsx(action.destructive && 'text-red-600')}
              >
                {action.icon && (
                  <action.icon className="h-4 w-4" aria-hidden="true" data-slot="icon" />
                )}
                {action.label}
              </DropdownItem>
            )
          }

          return (
            <DropdownItem
              key={action.key}
              disabled={isDisabled}
              className={clsx(action.destructive && 'text-red-600')}
              onClick={() => action.onAction(item)}
            >
              {action.icon && (
                <action.icon className="h-4 w-4" aria-hidden="true" data-slot="icon" />
              )}
              {action.label}
            </DropdownItem>
          )
        })}
      </DropdownMenu>
    </Dropdown>
  )
}
