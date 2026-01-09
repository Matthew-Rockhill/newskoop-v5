'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { DataListContextValue, DataListProps } from './types'
import { DataListHeader } from './DataListHeader'
import { DataListTable } from './DataListTable'
import { DataListCards } from './DataListCards'
import { DataListEmpty } from './DataListEmpty'
import { DataListLoading } from './DataListLoading'
import { DataListPagination } from './DataListPagination'
import { DataListBulkActions } from './DataListBulkActions'

// Create context with a generic default
const DataListContext = createContext<DataListContextValue<any> | null>(null)

// Hook to access context
export function useDataListContext<T extends { id: string }>(): DataListContextValue<T> {
  const context = useContext(DataListContext)
  if (!context) {
    throw new Error('useDataListContext must be used within a DataList')
  }
  return context as DataListContextValue<T>
}

// Hook for responsive mobile detection
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  // Check on mount and window resize
  if (typeof window !== 'undefined') {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)

    // Use effect-like behavior with useState initialization
    if (!isMobile && window.innerWidth < 640) {
      setIsMobile(true)
    }
  }

  return isMobile
}

export function DataList<T extends { id: string }>({
  items,
  isLoading = false,
  error = null,
  variant,
  columns,
  dense = false,
  striped = true,
  sortable = false,
  sortKey,
  sortDirection,
  onSortChange,
  selectable = false,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  bulkActions,
  rowActions,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchValue: controlledSearchValue,
  onSearchChange,
  filters,
  pagination,
  onRowClick,
  getRowHref,
  expandable,
  emptyState,
  ariaLabel,
  className,
}: DataListProps<T>) {
  // Internal state for selection if not controlled
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([])
  const selectedIds = controlledSelectedIds ?? internalSelectedIds
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // Internal state for expanded rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Handle selection changes
  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      if (onSelectionChange) {
        onSelectionChange(ids)
      } else {
        setInternalSelectedIds(ids)
      }
    },
    [onSelectionChange]
  )

  // Toggle single selection
  const toggleSelection = useCallback(
    (id: string) => {
      const newIds = selectedIdsSet.has(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
      handleSelectionChange(newIds)
    },
    [selectedIds, selectedIdsSet, handleSelectionChange]
  )

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === items.length) {
      handleSelectionChange([])
    } else {
      handleSelectionChange(items.map((item) => item.id))
    }
  }, [items, selectedIds.length, handleSelectionChange])

  // Toggle expanded
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Computed selection state
  const isAllSelected = items.length > 0 && selectedIds.length === items.length
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < items.length

  // Context value
  const contextValue: DataListContextValue<T> = useMemo(
    () => ({
      items,
      columns,
      variant,
      dense,
      striped,
      selectable,
      selectedIds: selectedIdsSet,
      toggleSelection,
      toggleSelectAll,
      isAllSelected,
      isPartiallySelected,
      sortKey,
      sortDirection,
      onSortChange,
      rowActions,
      onRowClick,
      getRowHref,
      expandable,
      expandedIds,
      toggleExpanded,
    }),
    [
      items,
      columns,
      variant,
      dense,
      striped,
      selectable,
      selectedIdsSet,
      toggleSelection,
      toggleSelectAll,
      isAllSelected,
      isPartiallySelected,
      sortKey,
      sortDirection,
      onSortChange,
      rowActions,
      onRowClick,
      getRowHref,
      expandable,
      expandedIds,
      toggleExpanded,
    ]
  )

  // Determine if we should show bulk actions bar
  const showBulkActions = selectable && selectedIds.length > 0 && bulkActions && bulkActions.length > 0

  // Determine if we should show empty state
  const showEmpty = !isLoading && !error && items.length === 0

  // Determine if we should show content
  const showContent = !isLoading && !error && items.length > 0

  return (
    <DataListContext.Provider value={contextValue}>
      <div className={clsx('flex flex-col', className)}>
        {/* Header with search and filters */}
        {(searchable || (filters && filters.length > 0)) && (
          <DataListHeader
            searchable={searchable}
            searchPlaceholder={searchPlaceholder}
            searchValue={controlledSearchValue}
            onSearchChange={onSearchChange}
            filters={filters}
          />
        )}

        {/* Bulk actions bar */}
        {showBulkActions && (
          <DataListBulkActions
            selectedCount={selectedIds.length}
            totalCount={items.length}
            actions={bulkActions!}
            selectedIds={selectedIds}
            onClearSelection={() => handleSelectionChange([])}
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <DataListLoading
            variant={variant}
            rowCount={pagination?.pageSize ?? 10}
            columns={columns.length}
          />
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm text-red-600">
              {error.message || 'An error occurred while loading data.'}
            </p>
          </div>
        )}

        {/* Empty state */}
        {showEmpty && <DataListEmpty {...emptyState} />}

        {/* Content */}
        {showContent && (
          <div
            role={selectable ? 'grid' : 'list'}
            aria-label={ariaLabel}
            aria-describedby={pagination ? 'datalist-pagination-info' : undefined}
          >
            {variant === 'table' ? (
              <DataListTable items={items} columns={columns} />
            ) : (
              <DataListCards items={items} columns={columns} />
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > pagination.pageSize && (
          <div className="mt-6" id="datalist-pagination-info">
            <DataListPagination {...pagination} />
          </div>
        )}
      </div>
    </DataListContext.Provider>
  )
}
