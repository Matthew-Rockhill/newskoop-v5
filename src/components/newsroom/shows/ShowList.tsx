'use client';

import { useRouter } from 'next/navigation';
import { KeyboardEvent } from 'react';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Show } from '@/hooks/use-shows';
import { PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

// Helper for keyboard navigation on clickable elements
function handleKeyboardNavigation(callback: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
}

interface ShowListProps {
  shows: Show[];
  onEdit?: (show: Show) => void;
  onDelete?: (show: Show) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ShowList({ shows, onEdit, onDelete, canEdit = true, canDelete = false }: ShowListProps) {
  const router = useRouter();

  if (shows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-zinc-500">No shows found</p>
      </div>
    );
  }

  return (
    <Table striped>
      <TableHead>
        <TableRow>
          <TableHeader>Title</TableHeader>
          <TableHeader className="text-center">Episodes</TableHeader>
          <TableHeader className="text-center">Status</TableHeader>
          <TableHeader>Created</TableHeader>
          <TableHeader className="text-right">Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {shows.map((show) => (
          <>
            <TableRow
              key={show.id}
              tabIndex={0}
              className="hover:bg-zinc-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-kelly-green"
              onClick={() => router.push(`/newsroom/shows/${show.id}`)}
              onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/shows/${show.id}`))}
            >
              <TableCell className="px-4 py-3">
              <div>
                <p className="font-medium text-zinc-900">{show.title}</p>
                {show.description && (
                  <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">{show.description}</p>
                )}
              </div>
              </TableCell>
              <TableCell className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-zinc-700">
                {show._count?.episodes || 0}
                {(show._count?.subShows ?? 0) > 0 && (
                  <span className="text-xs text-zinc-400 ml-1">
                    ({show._count?.subShows} sub-shows)
                  </span>
                )}
              </span>
              </TableCell>
              <TableCell className="px-4 py-3 text-center">
              <Badge color={show.isPublished ? 'green' : 'zinc'}>
                {show.isPublished ? 'Published' : 'Draft'}
              </Badge>
              </TableCell>
              <TableCell className="px-4 py-3">
              <span className="text-sm text-zinc-500">
                {formatDistanceToNow(new Date(show.createdAt), { addSuffix: true })}
              </span>
              </TableCell>
              <TableCell className="px-4 py-3">
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => router.push(`/newsroom/shows/${show.id}`)}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                  aria-label={`View show: ${show.title}`}
                >
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                {canEdit && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(show)}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                    aria-label={`Edit show: ${show.title}`}
                  >
                    <PencilIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                {canDelete && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(show)}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label={`Delete show: ${show.title}`}
                  >
                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
              </TableCell>
            </TableRow>
            {/* Render sub-shows indented beneath parent */}
            {show.subShows?.map((sub) => (
              <TableRow
                key={sub.id}
                tabIndex={0}
                className="hover:bg-zinc-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-kelly-green bg-zinc-50/50"
                onClick={() => router.push(`/newsroom/shows/${sub.id}`)}
                onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/shows/${sub.id}`))}
              >
                <TableCell className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 text-sm select-none" aria-hidden="true">&#x2514;</span>
                    <p className="font-medium text-zinc-700 text-sm">{sub.title}</p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-2 text-center">
                  <span className="text-sm text-zinc-500">{sub._count?.episodes || 0}</span>
                </TableCell>
                <TableCell className="px-4 py-2 text-center">
                  <Badge color={sub.isPublished ? 'green' : 'zinc'}>
                    {sub.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-2">
                  <span className="text-sm text-zinc-400">
                    {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => router.push(`/newsroom/shows/${sub.id}`)}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                      aria-label={`View sub-show: ${sub.title}`}
                    >
                      <EyeIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </>
        ))}
      </TableBody>
    </Table>
  );
}
