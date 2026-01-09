'use client'

import type React from 'react'
import clsx from 'clsx'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { Checkbox } from '../checkbox'
import { Link } from '../link'
import { useDataListContext } from './DataList'
import { DataListActions } from './DataListActions'
import type { DataListColumn } from './types'

interface DataListRowProps<T extends { id: string }> {
  item: T
  index: number
  columns: DataListColumn<T>[]
}

export function DataListRow<T extends { id: string }>({
  item,
  index,
  columns,
}: DataListRowProps<T>) {
  const {
    dense,
    striped,
    selectable,
    selectedIds,
    toggleSelection,
    rowActions,
    onRowClick,
    getRowHref,
    expandable,
    expandedIds,
    toggleExpanded,
  } = useDataListContext<T>()

  const isSelected = selectedIds.has(item.id)
  const isExpanded = expandedIds.has(item.id)
  const isExpandable = expandable?.isExpandable ? expandable.isExpandable(item) : !!expandable
  const href = getRowHref?.(item)

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking on interactive elements
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
      if (isExpandable) {
        toggleExpanded(item.id)
      } else if (onRowClick) {
        onRowClick(item)
      }
    }
  }

  return (
    <>
      <tr
        className={clsx(
          'group transition-colors',
          // Striped styling
          striped && index % 2 === 1 && 'bg-zinc-50 dark:bg-zinc-800/50',
          // Selection styling
          isSelected && 'bg-kelly-green/5 dark:bg-kelly-green/10',
          // Hover styling
          (onRowClick || href) && 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800',
          // Focus styling
          'focus-within:bg-zinc-100 dark:focus-within:bg-zinc-800'
        )}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        tabIndex={onRowClick || href ? 0 : undefined}
        aria-selected={selectable ? isSelected : undefined}
        data-state={isExpanded ? 'expanded' : undefined}
      >
        {/* Selection checkbox */}
        {selectable && (
          <td className="relative w-12 px-4 sm:w-16 sm:px-6">
            {isSelected && (
              <div className="absolute inset-y-0 left-0 w-0.5 bg-kelly-green" />
            )}
            <Checkbox
              checked={isSelected}
              onChange={() => toggleSelection(item.id)}
              aria-label={`Select row ${index + 1}`}
              color="emerald"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </td>
        )}

        {/* Expand button */}
        {expandable && (
          <td className="w-10 px-2">
            {isExpandable && (
              <button
                type="button"
                className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpanded(item.id)
                }}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
              >
                <ChevronRightIcon
                  className={clsx(
                    'h-5 w-5 text-zinc-500 transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                />
              </button>
            )}
          </td>
        )}

        {/* Data cells */}
        {columns.map((column, colIndex) => (
          <td
            key={column.key}
            className={clsx(
              'text-sm text-zinc-900 dark:text-zinc-100',
              dense ? 'px-3 py-2' : 'px-4 py-4',
              column.align === 'center' && 'text-center',
              column.align === 'right' && 'text-right',
              // Responsive visibility
              column.priority === 2 && 'hidden sm:table-cell',
              column.priority === 3 && 'hidden lg:table-cell',
              column.className
            )}
          >
            {/* Wrap first column content with link if href provided */}
            {colIndex === 0 && href ? (
              <Link
                href={href}
                className="block focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                {column.render(item, index)}
              </Link>
            ) : (
              column.render(item, index)
            )}
          </td>
        ))}

        {/* Actions column */}
        {rowActions && rowActions.length > 0 && (
          <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
            <DataListActions item={item} actions={rowActions} />
          </td>
        )}
      </tr>

      {/* Expanded content */}
      {expandable && isExpanded && (
        <tr className="bg-zinc-50 dark:bg-zinc-800/50">
          <td
            colSpan={
              columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + (rowActions ? 1 : 0)
            }
            className="px-6 py-4"
          >
            {expandable.render(item)}
          </td>
        </tr>
      )}
    </>
  )
}
