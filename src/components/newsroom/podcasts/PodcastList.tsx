'use client';

import { useRouter } from 'next/navigation';
import { KeyboardEvent } from 'react';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Podcast } from '@/hooks/use-podcasts';
import { PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

function handleKeyboardNavigation(callback: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
}

interface PodcastListProps {
  podcasts: Podcast[];
  onEdit?: (podcast: Podcast) => void;
  onDelete?: (podcast: Podcast) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function PodcastList({ podcasts, onEdit, onDelete, canEdit = true, canDelete = false }: PodcastListProps) {
  const router = useRouter();

  if (podcasts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-zinc-500">No podcasts found</p>
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
        {podcasts.map((podcast) => (
          <TableRow
            key={podcast.id}
            tabIndex={0}
            className="hover:bg-zinc-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-kelly-green"
            onClick={() => router.push(`/newsroom/podcasts/${podcast.id}`)}
            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/podcasts/${podcast.id}`))}
          >
            <TableCell className="px-4 py-3">
              <div>
                <p className="font-medium text-zinc-900">{podcast.title}</p>
                {podcast.description && (
                  <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">{podcast.description}</p>
                )}
              </div>
            </TableCell>
            <TableCell className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-zinc-700">
                {podcast._count?.episodes || 0}
              </span>
            </TableCell>
            <TableCell className="px-4 py-3 text-center">
              <Badge color={podcast.isPublished ? 'green' : 'zinc'}>
                {podcast.isPublished ? 'Published' : 'Draft'}
              </Badge>
            </TableCell>
            <TableCell className="px-4 py-3">
              <span className="text-sm text-zinc-500">
                {formatDistanceToNow(new Date(podcast.createdAt), { addSuffix: true })}
              </span>
            </TableCell>
            <TableCell className="px-4 py-3">
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => router.push(`/newsroom/podcasts/${podcast.id}`)}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                  aria-label={`View podcast: ${podcast.title}`}
                >
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                {canEdit && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(podcast)}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                    aria-label={`Edit podcast: ${podcast.title}`}
                  >
                    <PencilIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                {canDelete && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(podcast)}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label={`Delete podcast: ${podcast.title}`}
                  >
                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
