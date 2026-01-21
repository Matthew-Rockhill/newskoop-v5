import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { CheckIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface RevisionNote {
  id: string;
  content: string;
  type: 'REVISION_REQUEST';
  category?: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    staffRole: string;
  };
  createdAt: string;
}

interface RevisionNotesProps {
  storyId: string;
  onRevisionResolved?: (revisionId: string, resolved: boolean) => void;
  onRevisionStatusChanged?: (allActiveResolved: boolean, activeCount: number) => void;
}

export function RevisionNotes({ storyId, onRevisionResolved, onRevisionStatusChanged }: RevisionNotesProps) {
  const { data: session } = useSession();
  const [revisionNotes, setRevisionNotes] = useState<RevisionNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingNotes, setResolvingNotes] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  const fetchRevisionNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}/comments?type=REVISION_REQUEST`);
      if (!response.ok) {
        throw new Error('Failed to fetch revision notes');
      }

      const data = await response.json();
      const notes = data.comments || [];
      setRevisionNotes(notes);

      // Notify parent of initial revision status
      const activeRevisions = notes.filter((note: RevisionNote) => !note.isResolved);
      onRevisionStatusChanged?.(activeRevisions.length === 0, activeRevisions.length);
    } catch (error) {
      console.error('Error fetching revision notes:', error);
      toast.error('Failed to load revision notes');
    } finally {
      setIsLoading(false);
    }
  }, [storyId, onRevisionStatusChanged]);

  useEffect(() => {
    fetchRevisionNotes();
  }, [fetchRevisionNotes]);

  const handleResolveToggle = async (revisionId: string, resolved: boolean) => {
    if (!session?.user) return;

    // Add to resolving set
    setResolvingNotes(prev => new Set(prev).add(revisionId));

    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}/comments/${revisionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: resolved }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to update revision note';

        if (response.status === 403) {
          toast.error('You do not have permission to resolve this revision note');
          return;
        }

        throw new Error(errorMessage);
      }

      // Update local state
      setRevisionNotes(prev => {
        const updatedNotes = prev.map(note =>
          note.id === revisionId
            ? {
                ...note,
                isResolved: resolved,
                resolvedBy: resolved ? session?.user?.id : undefined,
                resolvedAt: resolved ? new Date().toISOString() : undefined
              }
            : note
        );

        // Notify parent of revision status change
        const activeRevisions = updatedNotes.filter(note => !note.isResolved);
        onRevisionStatusChanged?.(activeRevisions.length === 0, activeRevisions.length);

        return updatedNotes;
      });

      toast.success(resolved ? 'Revision marked as resolved' : 'Revision marked as unresolved');
      onRevisionResolved?.(revisionId, resolved);
    } catch (error) {
      console.error('Error updating revision note:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update revision note');
    } finally {
      // Remove from resolving set
      setResolvingNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(revisionId);
        return newSet;
      });
    }
  };

  const canResolveRevision = () => {
    if (!session?.user) return false;

    const userRole = session.user.staffRole;

    // Admins and editors can always resolve revision notes
    if (userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'EDITOR') {
      return true;
    }

    // Sub-editors can resolve if they're assigned to the story
    if (userRole === 'SUB_EDITOR') {
      return true;
    }

    // Story authors can resolve revision notes
    if (userRole === 'JOURNALIST' || userRole === 'INTERN') {
      return true;
    }

    return false;
  };

  const activeRevisions = revisionNotes.filter(note => !note.isResolved);
  const completedRevisions = revisionNotes.filter(note => note.isResolved);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'JOURNALIST': return 'Journalist';
      case 'SUB_EDITOR': return 'Sub-Editor';
      case 'EDITOR': return 'Editor';
      case 'ADMIN': return 'Admin';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-4">
          <Text className="text-zinc-500">Loading revision notes...</Text>
        </div>
      </Card>
    );
  }

  if (revisionNotes.length === 0) {
    return (
      <Card className="p-6">
        <Heading level={3} className="mb-4">Revision Notes</Heading>
        <div className="text-center py-6">
          <CheckIcon className="h-8 w-8 text-green-500 mx-auto mb-2" aria-hidden="true" />
          <Text className="text-zinc-500">No revision notes</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Heading level={3} className="mb-4">Revision Notes</Heading>

      {/* Active Revisions */}
      {activeRevisions.length > 0 && (
        <div className="space-y-4 mb-6">
          <Text className="text-sm font-medium text-zinc-700">Active Revisions</Text>
          {activeRevisions.map((revision) => (
            <div key={revision.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={revision.isResolved}
                  onChange={(checked) => handleResolveToggle(revision.id, checked)}
                  className="mt-1"
                  disabled={!canResolveRevision() || resolvingNotes.has(revision.id)}
                  aria-label={`Mark revision as ${revision.isResolved ? 'unresolved' : 'resolved'}`}
                />
                <div className="flex-1 space-y-2">
                  {/* Author info row */}
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                    <Text className="text-sm font-medium text-zinc-900">
                      {revision.author.firstName} {revision.author.lastName}
                    </Text>
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center space-x-2">
                    <Badge color="yellow">
                      {getRoleDisplayName(revision.author.staffRole)}
                    </Badge>
                    {revision.category && (
                      <Badge color="blue">
                        {revision.category}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <Text className="text-sm text-zinc-700">{revision.content}</Text>

                  {/* Requested date row */}
                  <div className="flex items-center space-x-2 text-xs text-zinc-500">
                    <ClockIcon className="h-3 w-3" aria-hidden="true" />
                    <span>Requested: {formatDate(revision.createdAt)}</span>
                    {resolvingNotes.has(revision.id) && (
                      <span className="text-blue-600">Updating...</span>
                    )}
                  </div>

                  {!canResolveRevision() && (
                    <Text className="text-xs text-zinc-500">
                      Only editors can resolve revision notes
                    </Text>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Revisions */}
      {completedRevisions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Text className="text-sm font-medium text-zinc-700">Revision History</Text>
            <Button
              color="white"
              onClick={() => setShowHistory(!showHistory)}
              aria-expanded={showHistory}
            >
              {showHistory ? 'Hide' : 'Show'}
              <Badge color="green" className="ml-2">{completedRevisions.length}</Badge>
            </Button>
          </div>

          {showHistory && (
            <div className="space-y-3">
              {completedRevisions.map((revision) => (
                <div key={revision.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <CheckIcon className="h-4 w-4 text-green-600 mt-1" aria-hidden="true" />
                    <div className="flex-1 space-y-2">
                      {/* Author info row */}
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                        <Text className="text-sm font-medium text-zinc-900">
                          {revision.author.firstName} {revision.author.lastName}
                        </Text>
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center space-x-2">
                        <Badge color="green">
                          {getRoleDisplayName(revision.author.staffRole)}
                        </Badge>
                        {revision.category && (
                          <Badge color="blue">
                            {revision.category}
                          </Badge>
                        )}
                      </div>

                      {/* Content */}
                      <Text className="text-sm text-zinc-700">{revision.content}</Text>

                      {/* Requested date row */}
                      <div className="flex items-center space-x-2 text-xs text-zinc-500">
                        <ClockIcon className="h-3 w-3" aria-hidden="true" />
                        <span>Requested: {formatDate(revision.createdAt)}</span>
                      </div>

                      {/* Resolved date row */}
                      {revision.resolvedAt && (
                        <div className="flex items-center space-x-2 text-xs text-zinc-500">
                          <CheckIcon className="h-3 w-3" aria-hidden="true" />
                          <span>Resolved: {formatDate(revision.resolvedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
