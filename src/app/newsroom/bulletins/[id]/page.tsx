'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { formatLanguage } from '@/lib/language-utils';
import {
  PencilIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  MegaphoneIcon,
  ArchiveBoxIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';
import { Select } from '@/components/ui/select';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface BulletinStory {
  id: string;
  order: number;
  story?: {
    title: string;
    content: string;
    audioUrl?: string;
    author?: {
      firstName: string;
      lastName: string;
    };
    category?: {
      name: string;
    };
    publishedAt?: string;
    tags?: Array<{
      tag: {
        id: string;
        name: string;
        category: string;
      };
    }>;
  };
}

interface Bulletin {
  id: string;
  title: string;
  intro: string;
  outro: string;
  status: string;
  language: string;
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  publisher?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  schedule?: {
    title: string;
    time: string;
  };
  bulletinStories?: BulletinStory[];
}

interface Reviewer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  staffRole: string;
}

export default function BulletinViewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const bulletinId = params.id as string;
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['bulletin', bulletinId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/bulletins/${bulletinId}`);
      if (!response.ok) throw new Error('Failed to fetch bulletin');
      return response.json();
    },
  });

  const bulletin: Bulletin = data?.bulletin;

  // Fetch available reviewers (SUB_EDITOR and above)
  const { data: reviewersData, isLoading: isLoadingReviewers } = useQuery({
    queryKey: ['bulletin-reviewers'],
    queryFn: async () => {
      const response = await fetch('/api/users?staffRole=SUB_EDITOR,EDITOR,ADMIN,SUPERADMIN&isActive=true&perPage=100');
      if (!response.ok) throw new Error('Failed to fetch reviewers');
      return response.json();
    },
    enabled: showReviewerModal,
  });

  const reviewers: Reviewer[] = reviewersData?.users || [];

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: string; reviewerId?: string }) => {
      const response = await fetch(`/api/newsroom/bulletins/${bulletinId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletin', bulletinId] });
      queryClient.invalidateQueries({ queryKey: ['bulletins'] });
    },
  });

  const handleStatusChange = async (newStatus: string, successMessage: string) => {
    setIsUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({ status: newStatus });
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedReviewerId) {
      toast.error('Please select a reviewer');
      return;
    }
    setIsUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({
        status: 'IN_REVIEW',
        reviewerId: selectedReviewerId,
      });
      toast.success('Bulletin submitted for review');
      setShowReviewerModal(false);
      setSelectedReviewerId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit for review');
    } finally {
      setIsUpdating(false);
    }
  };

  // Permission helpers
  const userRole = session?.user?.staffRole;
  const isAuthor = bulletin?.author?.id === session?.user?.id;
  const isEditor = userRole && ['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
  const isSubEditorOrAbove = userRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);

  // Workflow action helpers
  const canSubmitForReview = bulletin?.status === 'DRAFT' && (isAuthor || isEditor);
  const canRequestRevision = bulletin?.status === 'IN_REVIEW' && isSubEditorOrAbove;
  const canApprove = bulletin?.status === 'IN_REVIEW' && isSubEditorOrAbove;
  const canPublish = bulletin?.status === 'APPROVED' && isEditor;
  const canArchive = bulletin?.status === 'PUBLISHED' && isEditor;
  const canEdit = (bulletin?.status === 'DRAFT' && (isAuthor || isEditor)) ||
                  (bulletin?.status === 'NEEDS_REVISION' && (isAuthor || isEditor)) ||
                  isEditor;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'zinc';
      case 'IN_REVIEW': return 'amber';
      case 'NEEDS_REVISION': return 'red';
      case 'APPROVED': return 'lime';
      case 'PUBLISHED': return 'emerald';
      case 'ARCHIVED': return 'zinc';
      default: return 'zinc';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading bulletin...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading bulletin: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button href="/newsroom/bulletins" className="mt-4">
            Back to Bulletins
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title={bulletin.title}
        description={
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
              <Badge color={getStatusColor(bulletin.status)}>
                {bulletin.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Language:</span>
              <Badge color="blue">
                {formatLanguage(bulletin.language)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Stories:</span>
              <span className="text-sm text-zinc-900 dark:text-white">
                {bulletin.bulletinStories?.length || 0}
              </span>
            </div>
          </div>
        }
        metadata={{
          sections: [
            {
              title: "Author & Timeline",
              items: [
                {
                  label: "Author",
                  value: (
                    <>
                      <Avatar
                        className="h-6 w-6"
                        name={`${bulletin.author.firstName} ${bulletin.author.lastName}`}
                      />
                      <span>{bulletin.author.firstName} {bulletin.author.lastName}</span>
                    </>
                  ),
                  type: 'avatar'
                },
                {
                  label: "Created",
                  value: formatDate(bulletin.createdAt),
                  type: 'date'
                },
                {
                  label: "Last Updated",
                  value: formatDate(bulletin.updatedAt),
                  type: 'date'
                }
              ]
            }
          ]
        }}
        actions={
          <div className="flex items-center space-x-3">
            <Button
              color="white"
              onClick={() => router.push('/newsroom/bulletins')}
            >
              ← Back to Bulletins
            </Button>

            {/* Edit Button */}
            {canEdit && (
              <Button
                color="white"
                onClick={() => router.push(`/newsroom/bulletins/${bulletin.id}/edit`)}
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}

            {/* Submit for Review - DRAFT → IN_REVIEW (opens modal to select reviewer) */}
            {canSubmitForReview && (
              <Button
                color="secondary"
                onClick={() => setShowReviewerModal(true)}
                disabled={isUpdating}
              >
                <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
            )}

            {/* Request Revision - IN_REVIEW → NEEDS_REVISION */}
            {canRequestRevision && (
              <Button
                color="red"
                onClick={() => handleStatusChange('NEEDS_REVISION', 'Revision requested')}
                disabled={isUpdating}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                {isUpdating ? 'Processing...' : 'Request Revision'}
              </Button>
            )}

            {/* Approve - IN_REVIEW → APPROVED */}
            {canApprove && (
              <Button
                color="primary"
                onClick={() => handleStatusChange('APPROVED', 'Bulletin approved')}
                disabled={isUpdating}
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                {isUpdating ? 'Approving...' : 'Approve'}
              </Button>
            )}

            {/* Publish - APPROVED → PUBLISHED */}
            {canPublish && (
              <Button
                color="primary"
                onClick={() => handleStatusChange('PUBLISHED', 'Bulletin published!')}
                disabled={isUpdating}
              >
                <MegaphoneIcon className="h-4 w-4 mr-2" />
                {isUpdating ? 'Publishing...' : 'Publish'}
              </Button>
            )}

            {/* Archive - PUBLISHED → ARCHIVED */}
            {canArchive && (
              <Button
                color="secondary"
                onClick={() => handleStatusChange('ARCHIVED', 'Bulletin archived')}
                disabled={isUpdating}
              >
                <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                {isUpdating ? 'Archiving...' : 'Archive'}
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Unified Script Flow */}
        <div className="lg:col-span-2">
          <Card className="p-8">
            {/* Script Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Bulletin Script
              </h3>
              <Badge color="zinc">
                {bulletin.bulletinStories?.length || 0} stories
              </Badge>
            </div>

            {/* Continuous Script Flow */}
            <div className="relative">
              {/* Single continuous line */}
              <div
                className="absolute left-[3px] top-0 bottom-0 w-0.5"
                style={{ backgroundColor: '#76BD43' }}
              />

              {/* Introduction Section */}
              <div className="relative pl-8 pb-6">
                <div
                  className="absolute left-0 top-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#76BD43' }}
                />
                <div className="mb-2">
                  <span
                    className="inline-block px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded"
                    style={{ color: '#76BD43', backgroundColor: 'rgba(118, 189, 67, 0.1)' }}
                  >
                    Intro
                  </span>
                </div>
                <div
                  className="prose prose-sm max-w-none"
                  style={{ color: '#272727' }}
                  dangerouslySetInnerHTML={{ __html: bulletin.intro }}
                />
              </div>

              {/* Stories Section */}
              {bulletin.bulletinStories && bulletin.bulletinStories.length > 0 ? (
                bulletin.bulletinStories
                  .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
                  .map((bulletinStory: BulletinStory, index: number) => (
                    <div key={bulletinStory.id} className="relative pl-8 py-6">
                      <div
                        className="absolute left-0 top-6 flex items-center justify-center w-2 h-2 rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: '#76BD43', width: '24px', height: '24px', left: '-8px' }}
                      >
                        {index + 1}
                      </div>

                      <div className="mb-2">
                        <span
                          className="inline-block px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded"
                          style={{ color: '#76BD43', backgroundColor: 'rgba(118, 189, 67, 0.1)' }}
                        >
                          Story {index + 1}
                        </span>
                        {bulletinStory.story?.category && (
                          <span className="ml-2 text-xs text-zinc-500">
                            {bulletinStory.story.category.name}
                          </span>
                        )}
                      </div>

                      <div
                        className="prose prose-sm max-w-none"
                        style={{ color: '#272727' }}
                        dangerouslySetInnerHTML={{ __html: bulletinStory.story?.content || '' }}
                      />

                      {/* Audio Player */}
                      {bulletinStory.story?.audioUrl && (
                        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
                          <audio
                            controls
                            className="w-full h-10"
                            preload="metadata"
                          >
                            <source src={bulletinStory.story.audioUrl} type="audio/mpeg" />
                            <source src={bulletinStory.story.audioUrl} type="audio/wav" />
                            <source src={bulletinStory.story.audioUrl} type="audio/ogg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="relative pl-8 py-6">
                  <div className="text-center py-8 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
                    <svg className="mx-auto h-10 w-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-zinc-500 mt-2 text-sm">No stories added yet</p>
                  </div>
                </div>
              )}

              {/* Outro Section */}
              <div className="relative pl-8 pt-6">
                <div
                  className="absolute left-0 top-7 w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#76BD43' }}
                />
                <div className="mb-2">
                  <span
                    className="inline-block px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded"
                    style={{ color: '#76BD43', backgroundColor: 'rgba(118, 189, 67, 0.1)' }}
                  >
                    Outro
                  </span>
                </div>
                <div
                  className="prose prose-sm max-w-none"
                  style={{ color: '#272727' }}
                  dangerouslySetInnerHTML={{ __html: bulletin.outro }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bulletin Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Bulletin Details</h3>
            
            <DescriptionList>
              <DescriptionTerm>Language</DescriptionTerm>
              <DescriptionDetails>
                <Badge color="blue">
                  {formatLanguage(bulletin.language)}
                </Badge>
              </DescriptionDetails>

              <DescriptionTerm>Total Stories</DescriptionTerm>
              <DescriptionDetails>
                {bulletin.bulletinStories?.length || 0}
              </DescriptionDetails>

              {bulletin.scheduledFor && (
                <>
                  <DescriptionTerm>Scheduled For</DescriptionTerm>
                  <DescriptionDetails>
                    {formatDate(bulletin.scheduledFor)}
                  </DescriptionDetails>
                </>
              )}

              {bulletin.schedule && (
                <>
                  <DescriptionTerm>Schedule</DescriptionTerm>
                  <DescriptionDetails>
                    {bulletin.schedule.title}
                    <br />
                    <span className="text-sm text-zinc-500">{bulletin.schedule.time}</span>
                  </DescriptionDetails>
                </>
              )}
            </DescriptionList>
          </Card>

          {/* Workflow Card - Show reviewer/publisher info */}
          {(bulletin.reviewer || bulletin.publisher) && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Workflow</h3>

              <DescriptionList>
                {bulletin.reviewer && (
                  <>
                    <DescriptionTerm>Reviewer</DescriptionTerm>
                    <DescriptionDetails>
                      <div className="flex items-center gap-2">
                        <Avatar
                          className="h-6 w-6"
                          name={`${bulletin.reviewer.firstName} ${bulletin.reviewer.lastName}`}
                        />
                        <span>{bulletin.reviewer.firstName} {bulletin.reviewer.lastName}</span>
                      </div>
                    </DescriptionDetails>
                  </>
                )}

                {bulletin.publisher && (
                  <>
                    <DescriptionTerm>Published By</DescriptionTerm>
                    <DescriptionDetails>
                      <div className="flex items-center gap-2">
                        <Avatar
                          className="h-6 w-6"
                          name={`${bulletin.publisher.firstName} ${bulletin.publisher.lastName}`}
                        />
                        <span>{bulletin.publisher.firstName} {bulletin.publisher.lastName}</span>
                      </div>
                    </DescriptionDetails>
                  </>
                )}

                {bulletin.publishedAt && (
                  <>
                    <DescriptionTerm>Published At</DescriptionTerm>
                    <DescriptionDetails>
                      {formatDate(bulletin.publishedAt)}
                    </DescriptionDetails>
                  </>
                )}
              </DescriptionList>
            </Card>
          )}
        </div>
      </div>

      {/* Reviewer Selection Modal */}
      <Dialog
        open={showReviewerModal}
        onClose={() => !isUpdating && setShowReviewerModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-zinc-900 rounded-lg shadow-xl">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title as={Heading} level={3}>
                  Submit for Review
                </Dialog.Title>
                <Button
                  type="button"
                  color="white"
                  onClick={() => setShowReviewerModal(false)}
                  disabled={isUpdating}
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <Text className="text-zinc-600 dark:text-zinc-400">
                  Select a sub-editor or editor to review this bulletin:
                </Text>

                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                  <Text className="font-medium text-zinc-900 dark:text-zinc-100">
                    &ldquo;{bulletin.title}&rdquo;
                  </Text>
                </div>

                {isLoadingReviewers ? (
                  <div className="text-center py-4">
                    <Text className="text-zinc-500">Loading reviewers...</Text>
                  </div>
                ) : reviewers.length === 0 ? (
                  <div className="text-center py-4">
                    <Text className="text-red-600">No reviewers available</Text>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Select Reviewer *
                    </label>
                    <Select
                      value={selectedReviewerId}
                      onChange={(e) => setSelectedReviewerId(e.target.value)}
                      disabled={isUpdating}
                    >
                      <option value="">Choose a reviewer...</option>
                      {reviewers.map((reviewer) => (
                        <option key={reviewer.id} value={reviewer.id}>
                          {reviewer.firstName} {reviewer.lastName} ({reviewer.staffRole})
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  color="white"
                  onClick={() => setShowReviewerModal(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitForReview}
                  disabled={!selectedReviewerId || isUpdating || isLoadingReviewers}
                >
                  {isUpdating ? 'Submitting...' : 'Submit for Review'}
                </Button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Container>
  );
}