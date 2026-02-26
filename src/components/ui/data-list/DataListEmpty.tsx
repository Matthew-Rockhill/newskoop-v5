'use client'

import { Button } from '../button'
import { Heading } from '../heading'
import { Text } from '../text'
import { PlusIcon } from '@heroicons/react/24/outline'
import type { EmptyStateConfig } from './types'

export function DataListEmpty({ icon: Icon, title, description, action }: EmptyStateConfig) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="mx-auto h-12 w-12 text-zinc-400" aria-hidden="true" />}

      <Heading level={4} className="mt-4 text-zinc-900 dark:text-white">
        {title}
      </Heading>

      {description && (
        <Text className="mt-2 max-w-sm text-zinc-500 dark:text-zinc-400">{description}</Text>
      )}

      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button href={action.href} color="primary">
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              {action.label}
            </Button>
          ) : (
            <Button onClick={action.onClick} color="primary">
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
