'use client'

import clsx from 'clsx'

interface DataListLoadingProps {
  variant: 'table' | 'cards'
  rowCount?: number
  columns?: number
}

export function DataListLoading({ variant, rowCount = 5, columns = 4 }: DataListLoadingProps) {
  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rowCount }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      {/* Header skeleton */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className={clsx(
                'h-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700',
                i === 0 ? 'w-32' : 'w-20'
              )}
            />
          ))}
        </div>
      </div>

      {/* Row skeletons */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {Array.from({ length: rowCount }).map((_, i) => (
          <RowSkeleton key={i} columns={columns} />
        ))}
      </div>
    </div>
  )
}

function RowSkeleton({ columns }: { columns: number }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      {/* Avatar skeleton */}
      <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />

      {/* Content skeletons */}
      <div className="flex flex-1 items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Additional columns */}
        {Array.from({ length: Math.max(0, columns - 2) }).map((_, i) => (
          <div
            key={i}
            className="hidden h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700 sm:block"
          />
        ))}
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* Image skeleton */}
      <div className="mb-4 h-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />

      {/* Title skeleton */}
      <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />

      {/* Description skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Meta skeleton */}
      <div className="mt-4 flex items-center gap-2">
        <div className="h-6 w-6 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  )
}
