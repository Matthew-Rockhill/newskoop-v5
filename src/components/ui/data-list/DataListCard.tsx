'use client'

import type React from 'react'
import clsx from 'clsx'
import { Checkbox } from '../checkbox'
import { Link } from '../link'
import { useDataListContext } from './DataList'
import { DataListActions } from './DataListActions'
import type { DataListColumn } from './types'

interface DataListCardProps<T extends { id: string }> {
  item: T
  index: number
  columns: DataListColumn<T>[]
}

export function DataListCard<T extends { id: string }>({
  item,
  index,
  columns,
}: DataListCardProps<T>) {
  const {
    selectable,
    selectedIds,
    toggleSelection,
    rowActions,
    onRowClick,
    getRowHref,
  } = useDataListContext<T>()

  const isSelected = selectedIds.has(item.id)
  const href = getRowHref?.(item)

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('[role="menu"]')
    ) {
      return
    }

    if (onRowClick) {
      onRowClick(item)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (onRowClick) {
        onRowClick(item)
      }
    }
  }

  // Use mobileRender if available for columns, otherwise use regular render
  const renderColumn = (column: DataListColumn<T>) => {
    if (column.mobileRender) {
      return column.mobileRender(item, index)
    }
    return column.render(item, index)
  }

  // Get primary column (first priority 1 column)
  const primaryColumn = columns.find((c) => c.priority === 1)
  const secondaryColumns = columns.filter((c) => c !== primaryColumn && c.priority <= 2)

  const CardWrapper = href ? Link : 'div'
  const cardWrapperProps = href
    ? { href, className: 'block' }
    : {
        onClick: handleCardClick,
        onKeyDown: handleKeyDown,
        tabIndex: onRowClick ? 0 : undefined,
        role: onRowClick ? 'button' : undefined,
      }

  return (
    <div
      className={clsx(
        'group relative overflow-hidden rounded-lg border bg-white transition-all',
        'border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900',
        // Selection styling
        isSelected
          ? 'border-kelly-green ring-2 ring-kelly-green/20'
          : 'hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-600',
        // Cursor
        (onRowClick || href) && 'cursor-pointer'
      )}
      aria-selected={selectable ? isSelected : undefined}
    >
      {/* Selection checkbox */}
      {selectable && (
        <div className="absolute left-3 top-3 z-10">
          <Checkbox
            checked={isSelected}
            onChange={() => toggleSelection(item.id)}
            aria-label={`Select item ${index + 1}`}
            color="emerald"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="rounded-md bg-white/90 p-1 shadow-sm backdrop-blur-sm"
          />
        </div>
      )}

      {/* Card content */}
      <CardWrapper {...(cardWrapperProps as any)}>
        <div className="p-4">
          {/* Primary content */}
          {primaryColumn && (
            <div className="mb-3">{renderColumn(primaryColumn)}</div>
          )}

          {/* Secondary content */}
          {secondaryColumns.length > 0 && (
            <div className="space-y-2">
              {secondaryColumns.map((column) => (
                <div key={column.key} className="text-sm text-zinc-600 dark:text-zinc-400">
                  {renderColumn(column)}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardWrapper>

      {/* Actions */}
      {rowActions && rowActions.length > 0 && (
        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <DataListActions item={item} actions={rowActions} />
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute inset-y-0 left-0 w-1 bg-kelly-green" aria-hidden="true" />
      )}
    </div>
  )
}
