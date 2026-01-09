'use client'

import clsx from 'clsx'
import { Button } from '../button'
import type { PaginationConfig } from './types'

interface DataListPaginationProps extends PaginationConfig {
  className?: string
}

export function DataListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: DataListPaginationProps) {
  const totalPages = Math.ceil(total / pageSize)

  // Don't show pagination if only one page
  if (totalPages <= 1) return null

  // Calculate visible page numbers
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const visiblePages = pages.slice(
    Math.max(0, Math.min(page - 3, totalPages - 5)),
    Math.min(totalPages, Math.max(5, page + 2))
  )

  // Calculate showing range
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-between gap-4 sm:flex-row',
        className
      )}
    >
      {/* Item count */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Showing <span className="font-medium text-zinc-700 dark:text-zinc-200">{startItem}</span> to{' '}
        <span className="font-medium text-zinc-700 dark:text-zinc-200">{endItem}</span> of{' '}
        <span className="font-medium text-zinc-700 dark:text-zinc-200">{total}</span> results
      </p>

      {/* Page controls */}
      <nav className="flex items-center gap-2" aria-label="Pagination">
        {/* Previous button */}
        <Button
          outline
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          Previous
        </Button>

        {/* First page */}
        {visiblePages[0] > 1 && (
          <>
            <PageButton page={1} currentPage={page} onPageChange={onPageChange} />
            {visiblePages[0] > 2 && (
              <span className="px-2 text-zinc-400" aria-hidden="true">
                ...
              </span>
            )}
          </>
        )}

        {/* Visible pages */}
        {visiblePages.map((pageNum) => (
          <PageButton
            key={pageNum}
            page={pageNum}
            currentPage={page}
            onPageChange={onPageChange}
          />
        ))}

        {/* Last page */}
        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="px-2 text-zinc-400" aria-hidden="true">
                ...
              </span>
            )}
            <PageButton page={totalPages} currentPage={page} onPageChange={onPageChange} />
          </>
        )}

        {/* Next button */}
        <Button
          outline
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          Next
        </Button>
      </nav>
    </div>
  )
}

interface PageButtonProps {
  page: number
  currentPage: number
  onPageChange: (page: number) => void
}

function PageButton({ page, currentPage, onPageChange }: PageButtonProps) {
  const isActive = page === currentPage

  return (
    <Button
      onClick={() => onPageChange(page)}
      aria-label={`Go to page ${page}`}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(
        'min-w-[2.5rem]',
        isActive
          ? 'bg-kelly-green text-white hover:bg-kelly-green/90'
          : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
      )}
    >
      {page}
    </Button>
  )
}
