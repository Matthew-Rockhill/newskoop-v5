// DataList component types
import type React from 'react'

/**
 * Column priority for responsive display
 * 1 = Always visible (mobile and up)
 * 2 = Visible on tablet and up
 * 3 = Visible on desktop only
 */
export type ColumnPriority = 1 | 2 | 3

/**
 * Sort direction for columns
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Column configuration for DataList
 */
export interface DataListColumn<T> {
  /** Unique key for the column */
  key: string
  /** Column header text */
  header: string
  /** Responsive priority (1 = always show, 3 = desktop only) */
  priority: ColumnPriority
  /** Column width: 'auto' | 'shrink' | 'expand' | specific width like '200px' */
  width?: 'auto' | 'shrink' | 'expand' | string
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Whether column is sortable */
  sortable?: boolean
  /** Render function for table cells */
  render: (item: T, index: number) => React.ReactNode
  /** Optional render function for card layout on mobile */
  mobileRender?: (item: T, index: number) => React.ReactNode
  /** Optional class name for the column */
  className?: string
}

/**
 * Filter option for dropdown/select filters
 */
export interface FilterOption {
  value: string
  label: string
}

/**
 * Filter configuration
 */
export interface DataListFilter {
  /** Unique key for the filter */
  key: string
  /** Filter label */
  label: string
  /** Filter type */
  type: 'select' | 'multi-select' | 'button-group'
  /** Available options */
  options: FilterOption[]
  /** Current value(s) */
  value: string | string[]
  /** Change handler */
  onChange: (value: string | string[]) => void
}

/**
 * Bulk action configuration
 */
export interface BulkAction {
  /** Unique key for the action */
  key: string
  /** Action label */
  label: string
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>
  /** Action handler - receives selected item IDs */
  onAction: (selectedIds: string[]) => void | Promise<void>
  /** Whether action is destructive (shows in red) */
  destructive?: boolean
  /** Whether action is disabled */
  disabled?: boolean
  /** Confirmation message (if provided, shows confirm dialog) */
  confirmMessage?: string
}

/**
 * Row action configuration
 */
export interface RowAction<T> {
  /** Unique key for the action */
  key: string
  /** Action label */
  label: string
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>
  /** Action handler - receives the item */
  onAction: (item: T) => void
  /** Whether action is destructive (shows in red) */
  destructive?: boolean
  /** Whether action is disabled for a specific item */
  isDisabled?: (item: T) => boolean
  /** Whether action is hidden for a specific item */
  isHidden?: (item: T) => boolean
  /** Optional href for link actions */
  href?: (item: T) => string
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /** Current page (1-indexed) */
  page: number
  /** Items per page */
  pageSize: number
  /** Total number of items */
  total: number
  /** Page change handler */
  onPageChange: (page: number) => void
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>
  /** Empty state title */
  title: string
  /** Empty state description */
  description?: string
  /** Optional action button */
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

/**
 * Expandable row configuration
 */
export interface ExpandableConfig<T> {
  /** Render function for expanded content */
  render: (item: T) => React.ReactNode
  /** Whether a row is expandable */
  isExpandable?: (item: T) => boolean
  /** Initial expanded state */
  isExpanded?: (item: T) => boolean
}

/**
 * Main DataList component props
 */
export interface DataListProps<T extends { id: string }> {
  // Data
  /** Array of items to display */
  items: T[]
  /** Whether data is loading */
  isLoading?: boolean
  /** Error state */
  error?: Error | null

  // Display
  /** Display variant: table for data-heavy views, cards for browsing */
  variant: 'table' | 'cards'
  /** Column configuration */
  columns: DataListColumn<T>[]
  /** Whether to use dense spacing */
  dense?: boolean
  /** Whether to show striped rows (table only) */
  striped?: boolean

  // Sorting
  /** Whether sorting is enabled */
  sortable?: boolean
  /** Current sort key */
  sortKey?: string
  /** Current sort direction */
  sortDirection?: SortDirection
  /** Sort change handler */
  onSortChange?: (key: string, direction: SortDirection) => void

  // Selection / Bulk Actions
  /** Whether row selection is enabled */
  selectable?: boolean
  /** Currently selected item IDs */
  selectedIds?: string[]
  /** Selection change handler */
  onSelectionChange?: (ids: string[]) => void
  /** Available bulk actions */
  bulkActions?: BulkAction[]

  // Row Actions
  /** Actions available on each row */
  rowActions?: RowAction<T>[]

  // Search
  /** Whether search is enabled */
  searchable?: boolean
  /** Search placeholder text */
  searchPlaceholder?: string
  /** Current search value */
  searchValue?: string
  /** Search change handler */
  onSearchChange?: (value: string) => void

  // Filters
  /** Filter configuration */
  filters?: DataListFilter[]

  // Pagination
  /** Pagination configuration */
  pagination?: PaginationConfig

  // Row Behavior
  /** Row click handler */
  onRowClick?: (item: T) => void
  /** Get href for row link */
  getRowHref?: (item: T) => string | undefined
  /** Expandable row configuration */
  expandable?: ExpandableConfig<T>

  // Empty State
  /** Empty state configuration */
  emptyState: EmptyStateConfig

  // Accessibility
  /** Accessible label for the list */
  ariaLabel: string

  // Styling
  /** Additional class name */
  className?: string
}

/**
 * Context for DataList internal components
 */
export interface DataListContextValue<T extends { id: string }> {
  items: T[]
  columns: DataListColumn<T>[]
  variant: 'table' | 'cards'
  dense: boolean
  striped: boolean
  selectable: boolean
  selectedIds: Set<string>
  toggleSelection: (id: string) => void
  toggleSelectAll: () => void
  isAllSelected: boolean
  isPartiallySelected: boolean
  sortKey?: string
  sortDirection?: SortDirection
  onSortChange?: (key: string, direction: SortDirection) => void
  rowActions?: RowAction<T>[]
  onRowClick?: (item: T) => void
  getRowHref?: (item: T) => string | undefined
  expandable?: ExpandableConfig<T>
  expandedIds: Set<string>
  toggleExpanded: (id: string) => void
}
