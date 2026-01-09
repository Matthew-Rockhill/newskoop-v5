'use client'

import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'
import { Input, InputGroup } from '../input'
import { Button } from '../button'
import type { DataListFilter } from './types'

interface DataListHeaderProps {
  searchable?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: DataListFilter[]
}

export function DataListHeader({
  searchable = false,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filters,
}: DataListHeaderProps) {
  const hasFilters = filters && filters.length > 0

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      {searchable && (
        <div className="w-full sm:max-w-xs">
          <InputGroup>
            <MagnifyingGlassIcon data-slot="icon" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              aria-label={searchPlaceholder}
            />
          </InputGroup>
        </div>
      )}

      {/* Filters */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <FilterControl key={filter.key} filter={filter} />
          ))}
        </div>
      )}
    </div>
  )
}

interface FilterControlProps {
  filter: DataListFilter
}

function FilterControl({ filter }: FilterControlProps) {
  if (filter.type === 'button-group') {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {filter.options.map((option) => {
          const isActive = Array.isArray(filter.value)
            ? filter.value.includes(option.value)
            : filter.value === option.value

          return (
            <Button
              key={option.value}
              onClick={() => filter.onChange(option.value)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              )}
              plain
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    )
  }

  // Select filter (single or multi)
  return (
    <div className="relative">
      <select
        value={Array.isArray(filter.value) ? filter.value[0] : filter.value}
        onChange={(e) => filter.onChange(e.target.value)}
        className={clsx(
          'rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm',
          'focus:border-kelly-green focus:outline-none focus:ring-1 focus:ring-kelly-green',
          'dark:border-zinc-600 dark:bg-zinc-800 dark:text-white'
        )}
        aria-label={filter.label}
      >
        {filter.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
