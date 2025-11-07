'use client';

import { useRouter } from 'next/navigation';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Show } from '@/hooks/use-shows';
import { PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

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
          <TableHeader className="w-16"></TableHeader>
          <TableHeader>Title</TableHeader>
          <TableHeader className="text-center">Episodes</TableHeader>
          <TableHeader className="text-center">Status</TableHeader>
          <TableHeader>Created</TableHeader>
          <TableHeader className="text-right">Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {shows.map((show) => (
          <TableRow key={show.id} className="hover:bg-zinc-50 cursor-pointer" onClick={() => router.push(`/newsroom/shows/${show.id}`)}>
            <TableCell className="px-4 py-3">
            {show.coverImage ? (
              <div className="relative w-12 h-12 rounded overflow-hidden bg-zinc-100">
                <Image
                  src={show.coverImage}
                  alt={show.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded bg-zinc-200 flex items-center justify-center">
                <span className="text-xs text-zinc-500">No image</span>
              </div>
            )}
            </TableCell>
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
            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                color="white"
                onClick={() => router.push(`/newsroom/shows/${show.id}`)}
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
              {canEdit && onEdit && (
                <Button
                  size="sm"
                  color="white"
                  onClick={() => onEdit(show)}
                >
                  <PencilIcon className="w-4 h-4" />
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  size="sm"
                  color="red"
                  onClick={() => onDelete(show)}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
