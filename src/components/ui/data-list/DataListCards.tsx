'use client'

import clsx from 'clsx'
import { useDataListContext } from './DataList'
import { DataListCard } from './DataListCard'
import type { DataListColumn } from './types'

interface DataListCardsProps<T extends { id: string }> {
  items: T[]
  columns: DataListColumn<T>[]
}

export function DataListCards<T extends { id: string }>({
  items,
  columns,
}: DataListCardsProps<T>) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <DataListCard key={item.id} item={item} index={index} columns={columns} />
      ))}
    </div>
  )
}
