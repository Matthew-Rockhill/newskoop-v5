'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatDateShort } from '@/lib/format';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input, InputGroup } from '@/components/ui/input';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import { formatDuration, formatFileSize } from '@/lib/format-utils';
import { Pagination } from '@/components/ui/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { AudioClipEditModal } from '@/components/newsroom/AudioClipEditModal';
import { AudioClipDeleteModal } from '@/components/newsroom/AudioClipDeleteModal';

import {
  useAudioLibrary,
  useUploadAudioClip,
  useUpdateAudioClip,
  useDeleteAudioClip,
  type AudioClip,
} from '@/hooks/use-audio-library';

interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export default function AudioLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<AudioFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Edit modal state
  const [editingClip, setEditingClip] = useState<AudioClip | null>(null);

  // Delete modal state
  const [deletingClip, setDeletingClip] = useState<AudioClip | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useAudioLibrary({
    query: debouncedQuery || undefined,
    page,
    perPage: 20,
  });

  const uploadMutation = useUploadAudioClip();
  const updateMutation = useUpdateAudioClip();
  const deleteMutation = useDeleteAudioClip();

  const clips: AudioClip[] = data?.clips || [];
  const pagination = data?.pagination;

  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const audioFile of uploadFiles) {
        const formData = new FormData();
        formData.append('audioFile', audioFile.file);
        await uploadMutation.mutateAsync(formData);
      }
      toast.success(`Uploaded ${uploadFiles.length} clip${uploadFiles.length !== 1 ? 's' : ''}`);
      setUploadFiles([]);
      setShowUpload(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setIsUploading(false);
    }
  }, [uploadFiles, uploadMutation]);

  const handleEditSave = useCallback(async (data: { title?: string; description?: string; tags?: string[] }) => {
    if (!editingClip) return;
    try {
      await updateMutation.mutateAsync({ id: editingClip.id, data });
      toast.success('Audio clip updated');
      setEditingClip(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }, [editingClip, updateMutation]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingClip) return;
    try {
      await deleteMutation.mutateAsync(deletingClip.id);
      toast.success('Audio clip deleted');
      setDeletingClip(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }, [deletingClip, deleteMutation]);

  const formatDate = formatDateShort;

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Audio Library"
          action={{
            label: showUpload ? 'Cancel Upload' : 'Upload Audio',
            onClick: () => {
              setShowUpload(!showUpload);
              if (showUpload) setUploadFiles([]);
            },
          }}
        />

        {/* Upload Section */}
        {showUpload && (
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <Text className="font-medium mb-3">Upload Audio Clips</Text>
            <FileUpload
              onFilesChange={setUploadFiles}
              maxFiles={10}
              maxFileSize={50}
            />
            {uploadFiles.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : `Upload ${uploadFiles.length} file${uploadFiles.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <InputGroup>
              <MagnifyingGlassIcon data-slot="icon" />
              <Input
                type="search"
                placeholder="Search by name, tag, or source story..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search audio clips"
              />
            </InputGroup>
          </div>
          {pagination && (
            <Text className="text-sm text-zinc-500">
              {pagination.total} clip{pagination.total !== 1 ? 's' : ''} total
            </Text>
          )}
        </div>

        {/* Clips Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-zinc-200 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-3/4 mb-3" />
                <div className="h-12 bg-zinc-100 rounded mb-3" />
                <div className="h-3 bg-zinc-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <Text>Failed to load audio library</Text>
          </div>
        ) : clips.length === 0 ? (
          <div className="text-center py-16">
            <MusicalNoteIcon className="h-16 w-16 mx-auto mb-4 text-zinc-300" />
            <Text className="text-zinc-500 text-lg mb-2">
              {searchQuery ? 'No clips found' : 'No audio clips yet'}
            </Text>
            <Text className="text-zinc-400 text-sm">
              {searchQuery
                ? 'Try a different search term'
                : 'Upload audio clips or they\'ll appear here when added to stories'}
            </Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <Text className="font-medium truncate">
                      {clip.title || clip.originalName}
                    </Text>
                    {clip.title && clip.title !== clip.originalName && (
                      <Text className="text-xs text-zinc-400 truncate">{clip.originalName}</Text>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => setEditingClip(clip)}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                      title="Edit metadata"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingClip(clip)}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete clip"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Audio Player */}
                <div className="mb-3">
                  <CustomAudioPlayer
                    clip={{
                      id: clip.id,
                      url: clip.url,
                      originalName: clip.title || clip.originalName,
                      duration: clip.duration ?? null,
                      mimeType: clip.mimeType,
                    }}
                    compact
                  />
                </div>

                {/* Tags */}
                {clip.tags && clip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {clip.tags.map((tag) => (
                      <Badge key={tag} color="blue" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                  <span>{formatDuration(clip.duration)}</span>
                  {clip.fileSize && <span>{formatFileSize(clip.fileSize)}</span>}
                  {clip._count && clip._count.stories > 0 && (
                    <span className="flex items-center gap-1">
                      <DocumentTextIcon className="h-3 w-3" />
                      {clip._count.stories} {clip._count.stories === 1 ? 'story' : 'stories'}
                    </span>
                  )}
                  {clip.sourceStory && (
                    <span className="truncate" title={`Source: ${clip.sourceStory.title}`}>
                      from: {clip.sourceStory.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                  {clip.uploader && (
                    <span>by {clip.uploader.firstName} {clip.uploader.lastName}</span>
                  )}
                  <span>{formatDate(clip.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AudioClipEditModal
        isOpen={!!editingClip}
        onClose={() => setEditingClip(null)}
        onSave={handleEditSave}
        clip={editingClip}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Modal */}
      <AudioClipDeleteModal
        isOpen={!!deletingClip}
        onClose={() => setDeletingClip(null)}
        onConfirm={handleDeleteConfirm}
        clipName={deletingClip?.title || deletingClip?.originalName || ''}
        linkedStoryCount={deletingClip?._count?.stories || 0}
        isLoading={deleteMutation.isPending}
      />
    </Container>
  );
}
