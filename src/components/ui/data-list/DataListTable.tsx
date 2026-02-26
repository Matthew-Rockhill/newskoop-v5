'use client'

import clsx from 'clsx'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { Checkbox } from '../checkbox'
import { useDataListContext } from './DataList'
import { DataListRow } from './DataListRow'
import type { DataListColumn, SortDirection } from './types'

interface DataListTableProps<T extends { id: string }> {
  items: T[]
  columns: DataListColumn<T>[]
}

export function DataListTable<T extends { id: string }>({
  items,
  columns,
}: DataListTableProps<T>) {
  const {
    dense,
    striped,
    selectable,
    isAllSelected,
    isPartiallySelected,
    toggleSelectAll,
    sortKey,
    sortDirection,
    onSortChange,
    expandable,
    rowActions,
  } = useDataListContext<T>()

  // Filter columns by priority for responsive display
  const visibleColumns = columns

  return (
    <div className="flow-root">
      <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  {/* Selection checkbox column */}
                  {selectable && (
                    <th scope="col" className="relative w-12 px-4 py-3.5 sm:w-16 sm:px-6">
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={isPartiallySelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                        color="emerald"
                      />
                    </th>
                  )}

                  {/* Expand column */}
                  {expandable && (
                    <th scope="col" className="w-10 px-2">
                      <span className="sr-only">Expand</span>
                    </th>
                  )}

                  {/* Data columns */}
                  {visibleColumns.map((column, _index) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={clsx(
                        'text-left text-sm font-semibold text-zinc-900 dark:text-white',
                        dense ? 'px-3 py-2' : 'px-4 py-3.5',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        // Responsive visibility based on priority
                        column.priority === 2 && 'hidden sm:table-cell',
                        column.priority === 3 && 'hidden lg:table-cell',
                        // Width classes
                        column.width === 'shrink' && 'w-0 whitespace-nowrap',
                        column.width === 'expand' && 'w-full',
                        column.className
                      )}
                      aria-sort={
                        column.sortable && sortKey === column.key
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      {column.sortable && onSortChange ? (
                        <button
                          type="button"
                          className="group inline-flex items-center gap-1 hover:text-kelly-green"
                          onClick={() => {
                            const newDirection: SortDirection =
                              sortKey === column.key && sortDirection === 'asc' ? 'desc' : 'asc'
                            onSortChange(column.key, newDirection)
                          }}
                        >
                          {column.header}
                          <SortIndicator
                            active={sortKey === column.key}
                            direction={sortKey === column.key ? sortDirection : undefined}
                          />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  ))}

                  {/* Actions column header */}
                  {rowActions && rowActions.length > 0 && (
                    <th
                      scope="col"
                      className={clsx(
                        'text-right text-sm font-semibold text-zinc-900 dark:text-white',
                        dense ? 'px-3 py-2' : 'pl-3 pr-4 py-3.5 sm:pr-6'
                      )}
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody
                className={clsx(
                  'divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900',
                  striped && 'divide-y-0'
                )}
              >
                {items.map((item, index) => (
                  <DataListRow key={item.id} item={item} index={index} columns={columns} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SortIndicatorProps {
  active: boolean
  direction?: SortDirection
}

function SortIndicator({ active, direction }: SortIndicatorProps) {
  return (
    <span
      className={clsx(
        'ml-1 flex-none rounded',
        active ? 'text-kelly-green' : 'invisible group-hover:visible text-zinc-400'
      )}
    >
      {direction === 'desc' ? (
        <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
      )}
    </span>
  )
}
