'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useDiaryUpcoming, useCompleteDiaryEntry } from '@/hooks/use-diary';
import type { DiaryEntry } from '@/hooks/use-diary';
import { DiaryEntryModal } from './DiaryEntryModal';

export function DiaryWidget() {
  const { data, isLoading } = useDiaryUpcoming();
  const completeMutation = useCompleteDiaryEntry();
  const [modalOpen, setModalOpen] = useState(false);

  const total = data?.total || 0;
  const grouped = data?.grouped;

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heading level={2}>Newsroom Diary</Heading>
          </div>
        </div>
        <Card className="p-6 animate-pulse">
          <div className="h-4 bg-zinc-200 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-zinc-200 rounded w-1/2"></div>
        </Card>
      </div>
    );
  }

  const renderEntry = (entry: DiaryEntry, colorClass: string, dateColorClass: string) => (
    <Card key={entry.id} className={`p-4 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{entry.title}</Text>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Text className={`text-sm font-medium ${dateColorClass}`}>
              {format(new Date(entry.dateTime), 'MMM d, h:mm a')}
            </Text>
            {entry.isOverdue && entry.daysUntil !== undefined && (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <Text className={`text-sm ${dateColorClass}`}>
                  {Math.abs(entry.daysUntil)} day{Math.abs(entry.daysUntil) !== 1 ? 's' : ''} overdue
                </Text>
              </>
            )}
            {entry.isDueToday && (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <Text className={`text-sm ${dateColorClass}`}>Due today</Text>
              </>
            )}
            {entry.isDueSoon && entry.daysUntil !== undefined && (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <Text className="text-sm text-amber-600 dark:text-amber-400">
                  In {entry.daysUntil} day{entry.daysUntil !== 1 ? 's' : ''}
                </Text>
              </>
            )}
            {entry.notes && (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-xs">{entry.notes}</Text>
              </>
            )}
            {entry.assignedTo && (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <Text className="text-sm text-indigo-600 dark:text-indigo-400">
                  {entry.assignedTo.firstName} {entry.assignedTo.lastName}
                </Text>
              </>
            )}
            {entry.story && (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <Link href={`/newsroom/stories/${entry.story.id}`} className="text-sm text-kelly-green hover:underline truncate max-w-xs">
                  {entry.story.title}
                </Link>
              </>
            )}
          </div>
        </div>
        <Button
          color="white"
          className="flex-shrink-0 ml-3"
          onClick={() => completeMutation.mutate(entry.id)}
          disabled={completeMutation.isPending}
        >
          Mark Done
        </Button>
      </div>
    </Card>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heading level={2}>Newsroom Diary</Heading>
          {total > 0 && <Badge color="blue">{total}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button color="white" onClick={() => setModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
          <Link href="/newsroom/diary">
            <Button outline>View All</Button>
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <CalendarDaysIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
            <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No diary entries</Heading>
            <Text className="text-zinc-600 dark:text-zinc-400 mb-4">Add diary entries to track upcoming events, deadlines, and editorial dates.</Text>
            <Button color="primary" onClick={() => setModalOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Entry
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Overdue */}
          {grouped?.overdue && grouped.overdue.length > 0 && (
            <div>
              <Heading level={3} className="mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" aria-hidden="true" />
                <span className="text-red-700 dark:text-red-400">Overdue</span>
                <Badge color="red">{grouped.overdue.length}</Badge>
              </Heading>
              <div className="space-y-2">
                {grouped.overdue.map(entry =>
                  renderEntry(entry, 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30', 'text-red-600 dark:text-red-400')
                )}
              </div>
            </div>
          )}

          {/* Due Today */}
          {grouped?.dueToday && grouped.dueToday.length > 0 && (
            <div>
              <Heading level={3} className="mb-3 flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-amber-600" aria-hidden="true" />
                <span className="text-amber-700 dark:text-amber-400">Due Today</span>
                <Badge color="amber">{grouped.dueToday.length}</Badge>
              </Heading>
              <div className="space-y-2">
                {grouped.dueToday.map(entry =>
                  renderEntry(entry, 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30', 'text-amber-600 dark:text-amber-400')
                )}
              </div>
            </div>
          )}

          {/* Due Soon */}
          {grouped?.dueSoon && grouped.dueSoon.length > 0 && (
            <div>
              <Heading level={3} className="mb-3 flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />
                <span className="text-amber-700 dark:text-amber-400">Due Soon</span>
                <Badge color="zinc">{grouped.dueSoon.length}</Badge>
              </Heading>
              <div className="space-y-2">
                {grouped.dueSoon.map(entry =>
                  renderEntry(entry, '', 'text-amber-600 dark:text-amber-400')
                )}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {grouped?.upcoming && grouped.upcoming.length > 0 && (
            <div>
              <Heading level={3} className="mb-3 flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-zinc-400" aria-hidden="true" />
                Upcoming
                <Badge color="zinc">{grouped.upcoming.length}</Badge>
              </Heading>
              <div className="space-y-2">
                {grouped.upcoming.map(entry =>
                  renderEntry(entry, '', 'text-zinc-500 dark:text-zinc-400')
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <DiaryEntryModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
