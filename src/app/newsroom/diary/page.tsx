'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  CalendarDaysIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  useDiaryEntries,
  useCompleteDiaryEntry,
  useDeleteDiaryEntry,
} from '@/hooks/use-diary';
import type { DiaryEntry } from '@/hooks/use-diary';
import { DiaryEntryModal } from '@/components/newsroom/diary/DiaryEntryModal';
import { SimplePagination } from '@/components/ui/pagination';
import { CardSkeleton } from '@/components/ui/skeleton';

export default function DiaryPage() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: staffData } = useQuery<{ users: { id: string; firstName: string; lastName: string; staffRole: string }[] }>({
    queryKey: ['staff-users-for-diary'],
    queryFn: async () => {
      const response = await fetch('/api/users?userType=STAFF&isActive=true&perPage=100');
      if (!response.ok) throw new Error('Failed to fetch staff users');
      return response.json();
    },
  });
  const staffUsers = staffData?.users || [];

  const { data, isLoading, error } = useDiaryEntries({
    page,
    perPage: 20,
    from: from || undefined,
    to: to || undefined,
    includeCompleted,
    assigneeId: assigneeFilter || undefined,
  });

  const completeMutation = useCompleteDiaryEntry();
  const deleteMutation = useDeleteDiaryEntry();

  const entries = data?.entries || [];
  const pagination = data?.pagination;
  const counts = data?.counts;

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
  };

  // Count overdue across all entries (from API response)
  const overdueCount = counts?.overdue || 0;
  const dueSoonCount = (counts?.dueToday || 0) + (counts?.dueSoon || 0);
  const totalActive = data?.total || 0;

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Newsroom Diary"
          description="Track upcoming events, deadlines, and editorial dates"
          action={{
            label: 'New Entry',
            onClick: () => {
              setEditingEntry(null);
              setModalOpen(true);
            },
          }}
        />

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Assigned To</label>
            <Select
              value={assigneeFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setAssigneeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {staffUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeCompleted"
              checked={includeCompleted}
              onChange={(e) => {
                setIncludeCompleted(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-zinc-300 text-kelly-green focus:ring-kelly-green"
            />
            <label htmlFor="includeCompleted" className="text-sm text-zinc-700">
              Show completed
            </label>
          </div>
          {(from || to || assigneeFilter) && (
            <Button
              outline
              onClick={() => {
                setFrom('');
                setTo('');
                setAssigneeFilter('');
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-red-500 mb-1">{overdueCount}</div>
            <Text className="text-zinc-600">Overdue</Text>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-amber-500 mb-1">{dueSoonCount}</div>
            <Text className="text-zinc-600">Due This Week</Text>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-zinc-900 mb-1">{totalActive}</div>
            <Text className="text-zinc-600">Total Active</Text>
          </Card>
        </div>

        {/* Entry List */}
        {isLoading ? (
          <CardSkeleton />
        ) : error ? (
          <Card className="p-8 text-center">
            <Text className="text-red-600">Failed to load diary entries</Text>
          </Card>
        ) : entries.length === 0 ? (
          <Card className="p-12 text-center">
            <CalendarDaysIcon className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
            <Heading level={3} className="text-zinc-500 mb-2">
              No diary entries
            </Heading>
            <Text className="text-zinc-400 mb-6">
              Create your first diary entry to track events and deadlines.
            </Text>
            <Button
              color="primary"
              onClick={() => {
                setEditingEntry(null);
                setModalOpen(true);
              }}
            >
              New Entry
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry: DiaryEntry) => {
              const bgClass = entry.isCompleted
                ? 'bg-zinc-50 opacity-75'
                : entry.isOverdue
                  ? 'border-red-200 bg-red-50'
                  : entry.isDueToday
                    ? 'border-amber-200 bg-amber-50'
                    : '';

              return (
                <Card key={entry.id} className={`p-5 ${bgClass}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Text className={`font-semibold ${entry.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-900'}`}>
                          {entry.title}
                        </Text>
                        {entry.isCompleted && (
                          <Badge color="green">Completed</Badge>
                        )}
                        {entry.isOverdue && !entry.isCompleted && (
                          <Badge color="red">Overdue</Badge>
                        )}
                        {entry.isDueToday && !entry.isCompleted && (
                          <Badge color="amber">Due Today</Badge>
                        )}
                        {entry.isDueSoon && !entry.isCompleted && (
                          <Badge color="blue">Due Soon</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-sm text-zinc-500 flex-wrap">
                        <span>{format(new Date(entry.dateTime), 'MMM d, yyyy h:mm a')}</span>
                        {entry.story && (
                          <>
                            <span>·</span>
                            <Link
                              href={`/newsroom/stories/${entry.story.id}`}
                              className="text-kelly-green hover:underline"
                            >
                              {entry.story.title}
                            </Link>
                          </>
                        )}
                        <span>·</span>
                        <span>
                          By {entry.createdBy.firstName} {entry.createdBy.lastName}
                        </span>
                        {entry.assignedTo && (
                          <>
                            <span>·</span>
                            <span className="text-indigo-600">
                              Assigned to {entry.assignedTo.firstName} {entry.assignedTo.lastName}
                            </span>
                          </>
                        )}
                      </div>

                      {entry.notes && (
                        <Text className="mt-2 text-sm text-zinc-600 line-clamp-2">{entry.notes}</Text>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        outline
                        onClick={() => completeMutation.mutate(entry.id)}
                        disabled={completeMutation.isPending}
                        title={entry.isCompleted ? 'Mark incomplete' : 'Mark done'}
                      >
                        {entry.isCompleted ? (
                          <ArrowPathIcon className="h-4 w-4" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Button outline onClick={() => handleEdit(entry)}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      {deleteConfirm === entry.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            color="red"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleteMutation.isPending}
                          >
                            Confirm
                          </Button>
                          <Button outline onClick={() => setDeleteConfirm(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button outline onClick={() => setDeleteConfirm(entry.id)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Pagination */}
            {pagination && (
              <SimplePagination
                page={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                className="mt-8"
              />
            )}
          </div>
        )}
      </div>

      <DiaryEntryModal
        open={modalOpen}
        onClose={handleCloseModal}
        entry={editingEntry}
      />
    </Container>
  );
}
