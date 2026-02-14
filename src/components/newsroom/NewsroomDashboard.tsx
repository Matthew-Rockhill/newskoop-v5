import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { RealtimeStatus } from '@/components/ui/RealtimeStatus';
import { useStories } from '@/hooks/use-stories';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  MusicalNoteIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ReassignButton } from '@/components/newsroom/ReassignButton';
import { useState, KeyboardEvent } from 'react';

// Helper for keyboard navigation on clickable elements
function handleKeyboardNavigation(callback: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
}

// Helper to format date/time for tasks - always shows actual date and time
function formatTaskDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

type TaskFilter = 'all' | 'review' | 'approve' | 'translate' | 'publish';
type WorkFilter = 'all' | 'drafts' | 'in_review' | 'approved' | 'published';

export function NewsroomDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;
  const userRole = session?.user?.staffRole;
  const isJournalist = userRole === 'JOURNALIST';
  const isSubEditor = userRole === 'SUB_EDITOR';
  const canReassign = ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole || '');

  // Determine available task filters based on role (always include 'all' first)
  const availableFilters: TaskFilter[] = ['all'];
  if (isJournalist) {
    availableFilters.push('review', 'translate');
  } else if (isSubEditor) {
    availableFilters.push('approve', 'translate', 'publish');
  } else {
    availableFilters.push('translate');
  }

  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilter>('all');
  const [activeWorkFilter, setActiveWorkFilter] = useState<WorkFilter>('all');

  // Fetch stories for the user (stage-based workflow)
  const { data: draftStoriesData } = useStories({
    authorId: userId,
    stage: 'DRAFT',
    page: 1,
    perPage: 20
  });

  const { data: needsReviewStoriesData } = useStories({
    authorId: userId,
    stage: 'NEEDS_JOURNALIST_REVIEW',
    page: 1,
    perPage: 20
  });

  const { data: needsApprovalStoriesData } = useStories({
    authorId: userId,
    stage: 'NEEDS_SUB_EDITOR_APPROVAL',
    page: 1,
    perPage: 20
  });

  const { data: approvedStoriesData } = useStories({
    authorId: userId,
    stage: 'APPROVED',
    page: 1,
    perPage: 20
  });

  const { data: publishedStoriesData } = useStories({
    authorId: userId,
    stage: 'PUBLISHED',
    page: 1,
    perPage: 20
  });

  // Journalist-specific: stories assigned for review
  const { data: reviewStoriesData } = useStories({
    assignedReviewerId: userId,
    stage: 'NEEDS_JOURNALIST_REVIEW',
    page: 1,
    perPage: 20
  });

  // Sub-editor specific: stories pending approval (assigned to this user)
  const { data: pendingApprovalStoriesData } = useStories({
    assignedApproverId: userId,
    stage: 'NEEDS_SUB_EDITOR_APPROVAL',
    page: 1,
    perPage: 20
  });

  // Sub-editor specific: translated stories ready for publishing (assigned to this user)
  const { data: approvedForPublishingStoriesData } = useStories({
    assignedApproverId: userId,
    stage: 'TRANSLATED',
    page: 1,
    perPage: 20
  });

  // All staff: assigned translation tasks
  const { data: translationTasksData } = useQuery({
    queryKey: ['translationTasks', userId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/stories?authorId=${userId}&isTranslation=true&stage=DRAFT&perPage=20`);
      if (!response.ok) throw new Error('Failed to fetch translation tasks');
      return response.json();
    },
    enabled: !!userId,
  });

  // SUB_EDITOR+: Follow-up diary
  const isSubEditorPlus = ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole || '');
  const queryClient = useQueryClient();

  const { data: followUpsData } = useQuery({
    queryKey: ['followUps'],
    queryFn: async () => {
      const response = await fetch('/api/newsroom/stories/follow-ups');
      if (!response.ok) throw new Error('Failed to fetch follow-ups');
      return response.json();
    },
    enabled: !!userId && isSubEditorPlus,
  });

  const markFollowUpDone = useMutation({
    mutationFn: async (storyId: string) => {
      const response = await fetch('/api/newsroom/stories/follow-ups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, completed: true }),
      });
      if (!response.ok) throw new Error('Failed to mark follow-up as done');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followUps'] });
    },
  });

  const followUpsGrouped = followUpsData?.grouped;
  const followUpsTotal = followUpsData?.total || 0;

  const draftStories = draftStoriesData?.stories || [];
  const needsReviewStories = needsReviewStoriesData?.stories || [];
  const needsApprovalStories = needsApprovalStoriesData?.stories || [];
  const approvedStories = approvedStoriesData?.stories || [];
  const publishedStories = publishedStoriesData?.stories || [];
  const reviewStories = reviewStoriesData?.stories || [];
  const pendingApprovalStories = pendingApprovalStoriesData?.stories || [];
  const approvedForPublishingStories = approvedForPublishingStoriesData?.stories || [];
  const translationTasks = translationTasksData?.stories || [];

  // Check if user has any work to show in "My Work" section
  const hasMyWork = draftStories.length > 0 || needsReviewStories.length > 0 || needsApprovalStories.length > 0 || approvedStories.length > 0 || publishedStories.length > 0;

  return (
    <Container>
      <PageHeader
        title="My Dashboard"
        description={`Welcome back, ${session?.user?.firstName || (isSubEditor ? 'Sub-Editor' : isJournalist ? 'Journalist' : 'Intern')}!`}
        actions={
          <div className="flex items-center gap-4">
            <RealtimeStatus />
            {!isSubEditor && (
              <Button color="primary" onClick={() => router.push('/newsroom/stories/new')}>
                Create Story
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-8 space-y-8">
        {/* MY TASKS SECTION - Always visible with filters */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Heading level={2}>My Tasks</Heading>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              onClick={() => setActiveTaskFilter('all')}
              color={activeTaskFilter === 'all' ? 'primary' : 'white'}
              className="transition-colors"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              All Tasks
              <Badge color={activeTaskFilter === 'all' ? 'white' : 'zinc'} className="ml-2">
                {reviewStories.length + pendingApprovalStories.length + translationTasks.length + approvedForPublishingStories.length}
              </Badge>
            </Button>
            {availableFilters.includes('review') && (
              <Button
                onClick={() => setActiveTaskFilter('review')}
                color={activeTaskFilter === 'review' ? 'primary' : 'white'}
                className="transition-colors"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                Review
                <Badge color={activeTaskFilter === 'review' ? 'white' : 'amber'} className="ml-2">
                  {reviewStories.length}
                </Badge>
              </Button>
            )}
            {availableFilters.includes('approve') && (
              <Button
                onClick={() => setActiveTaskFilter('approve')}
                color={activeTaskFilter === 'approve' ? 'primary' : 'white'}
                className="transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Approve
                <Badge color={activeTaskFilter === 'approve' ? 'white' : 'blue'} className="ml-2">
                  {pendingApprovalStories.length}
                </Badge>
              </Button>
            )}
            {availableFilters.includes('translate') && (
              <Button
                onClick={() => setActiveTaskFilter('translate')}
                color={activeTaskFilter === 'translate' ? 'primary' : 'white'}
                className="transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Translate
                <Badge color={activeTaskFilter === 'translate' ? 'white' : 'purple'} className="ml-2">
                  {translationTasks.length}
                </Badge>
              </Button>
            )}
            {availableFilters.includes('publish') && (
              <Button
                onClick={() => setActiveTaskFilter('publish')}
                color={activeTaskFilter === 'publish' ? 'primary' : 'white'}
                className="transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Publish
                <Badge color={activeTaskFilter === 'publish' ? 'white' : 'green'} className="ml-2">
                  {approvedForPublishingStories.length}
                </Badge>
              </Button>
            )}
          </div>

          {/* Task Content - All Tasks */}
          {activeTaskFilter === 'all' && (
            <div className="space-y-4">
              {reviewStories.length === 0 && pendingApprovalStories.length === 0 && translationTasks.length === 0 && approvedForPublishingStories.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <CheckCircleIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No tasks</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">Great work! You're all caught up.</Text>
                  </div>
                </Card>
              ) : (
                <>
                  {reviewStories.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <EyeIcon className="h-5 w-5" aria-hidden="true" />
                        Review Tasks
                        <Badge color="amber">{reviewStories.length}</Badge>
                      </Heading>
                      <div className="space-y-2">
                        {reviewStories.map((story: any) => (
                          <Card
                            key={story.id}
                            role="button"
                            tabIndex={0}
                            className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                            onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                    By {story.author?.firstName} {story.author?.lastName}
                                  </Text>
                                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                  <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                                    {formatTaskDate(story.updatedAt)}
                                  </Text>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {canReassign && (
                                  <ReassignButton
                                    storyId={story.id}
                                    storyTitle={story.title}
                                    currentAssignee={story.assignedReviewer ? `${story.assignedReviewer.firstName} ${story.assignedReviewer.lastName}` : null}
                                    type="reviewer"
                                  />
                                )}
                                <Badge color="amber">Review</Badge>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingApprovalStories.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                        Approval Tasks
                        <Badge color="blue">{pendingApprovalStories.length}</Badge>
                      </Heading>
                      <div className="space-y-2">
                        {pendingApprovalStories.map((story: any) => (
                          <Card
                            key={story.id}
                            role="button"
                            tabIndex={0}
                            className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                            onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                    By {story.author?.firstName} {story.author?.lastName}
                                  </Text>
                                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                  <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                                    {formatTaskDate(story.updatedAt)}
                                  </Text>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {canReassign && (
                                  <ReassignButton
                                    storyId={story.id}
                                    storyTitle={story.title}
                                    currentAssignee={story.assignedApprover ? `${story.assignedApprover.firstName} ${story.assignedApprover.lastName}` : null}
                                    type="approver"
                                  />
                                )}
                                <Badge color="blue">Approve</Badge>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {translationTasks.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
                        Translation Tasks
                        <Badge color="purple">{translationTasks.length}</Badge>
                      </Heading>
                      <div className="space-y-2">
                        {translationTasks.map((story: any) => (
                          <Card
                            key={story.id}
                            role="button"
                            tabIndex={0}
                            className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                            onClick={() => router.push(`/newsroom/stories/${story.id}/translate`)}
                            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}/translate`))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {story.language} translation
                                  </Text>
                                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                  <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                                    {formatTaskDate(story.updatedAt)}
                                  </Text>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {canReassign && (
                                  <ReassignButton
                                    storyId={story.id}
                                    storyTitle={story.title}
                                    currentAssignee={story.author ? `${story.author.firstName} ${story.author.lastName}` : null}
                                    type="translator"
                                    targetLanguage={story.language}
                                  />
                                )}
                                <Badge color="purple">Translate</Badge>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {approvedForPublishingStories.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                        Publishing Tasks
                        <Badge color="green">{approvedForPublishingStories.length}</Badge>
                      </Heading>
                      <div className="space-y-2">
                        {approvedForPublishingStories.map((story: any) => (
                          <Card
                            key={story.id}
                            role="button"
                            tabIndex={0}
                            className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                            onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Ready to publish
                                  </Text>
                                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                  <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                                    {formatTaskDate(story.updatedAt)}
                                  </Text>
                                </div>
                              </div>
                              <Badge color="green">Publish</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Task Content - Review */}
          {activeTaskFilter === 'review' && (
            <div>
              {reviewStories.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <EyeIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No review tasks</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">Great work! You're all caught up on reviews.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {reviewStories.map((story: any) => (
                      <div
                        key={story.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                              by {story.author.firstName} {story.author.lastName}
                            </Text>
                            <span className="text-zinc-300 dark:text-zinc-600">•</span>
                            <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                              {formatTaskDate(story.updatedAt)}
                            </Text>
                          </div>
                        </div>
                        {canReassign && (
                          <div className="flex-shrink-0 ml-2">
                            <ReassignButton
                              storyId={story.id}
                              storyTitle={story.title}
                              currentAssignee={story.assignedReviewer ? `${story.assignedReviewer.firstName} ${story.assignedReviewer.lastName}` : null}
                              type="reviewer"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Task Content - Approve */}
          {activeTaskFilter === 'approve' && (
            <div>
              {pendingApprovalStories.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <CheckCircleIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No approval tasks</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">Great work! You're all caught up on approvals.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {pendingApprovalStories.map((story: any) => (
                      <div
                        key={story.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                              by {story.author.firstName} {story.author.lastName}
                            </Text>
                            <span className="text-zinc-300 dark:text-zinc-600">•</span>
                            <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                              {formatTaskDate(story.updatedAt)}
                            </Text>
                          </div>
                        </div>
                        {canReassign && (
                          <div className="flex-shrink-0 ml-2">
                            <ReassignButton
                              storyId={story.id}
                              storyTitle={story.title}
                              currentAssignee={story.assignedApprover ? `${story.assignedApprover.firstName} ${story.assignedApprover.lastName}` : null}
                              type="approver"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Task Content - Translate */}
          {activeTaskFilter === 'translate' && (
            <div>
              {translationTasks.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <DocumentTextIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No translation tasks</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">No translations assigned to you at the moment.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {translationTasks.map((story: any) => (
                      <div
                        key={story.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                            {story.language && (
                              <Badge color="purple">{story.language}</Badge>
                            )}
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                              Translation not yet started
                            </Text>
                            <span className="text-zinc-300 dark:text-zinc-600">•</span>
                            <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                              {formatTaskDate(story.updatedAt)}
                            </Text>
                          </div>
                        </div>
                        {canReassign && (
                          <div className="flex-shrink-0 ml-2">
                            <ReassignButton
                              storyId={story.id}
                              storyTitle={story.title}
                              currentAssignee={story.author ? `${story.author.firstName} ${story.author.lastName}` : null}
                              type="translator"
                              targetLanguage={story.language}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Task Content - Publish */}
          {activeTaskFilter === 'publish' && (
            <div>
              {approvedForPublishingStories.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <CheckCircleIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No stories ready to publish</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">All translated stories have been published.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {approvedForPublishingStories.map((story: any) => (
                      <div
                        key={story.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                              by {story.author.firstName} {story.author.lastName}
                            </Text>
                            <span className="text-zinc-300 dark:text-zinc-600">•</span>
                            <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                              {formatTaskDate(story.updatedAt)}
                            </Text>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* FOLLOW-UP DIARY - SUB_EDITOR+ only */}
        {isSubEditorPlus && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heading level={2}>Follow-Up Diary</Heading>
                {followUpsTotal > 0 && (
                  <Badge color="amber">{followUpsTotal}</Badge>
                )}
              </div>
            </div>

            {followUpsTotal === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <CalendarDaysIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                  <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No follow-ups scheduled</Heading>
                  <Text className="text-zinc-600 dark:text-zinc-400">Follow-up dates set during publishing will appear here.</Text>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Overdue */}
                {followUpsGrouped?.overdue?.length > 0 && (
                  <div>
                    <Heading level={3} className="mb-3 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600" aria-hidden="true" />
                      <span className="text-red-700 dark:text-red-400">Overdue</span>
                      <Badge color="red">{followUpsGrouped.overdue.length}</Badge>
                    </Heading>
                    <div className="space-y-2">
                      {followUpsGrouped.overdue.map((story: any) => (
                        <Card key={story.id} className="p-4 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                              onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                            >
                              <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                              <div className="flex items-center gap-2 mt-1">
                                <Text className="text-sm text-red-600 dark:text-red-400 font-medium">
                                  {format(new Date(story.followUpDate), 'MMM d')}
                                </Text>
                                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                <Text className="text-sm text-red-600 dark:text-red-400">
                                  {Math.abs(story.daysUntilFollowUp)} day{Math.abs(story.daysUntilFollowUp) !== 1 ? 's' : ''} overdue
                                </Text>
                                {story.followUpNote && (
                                  <>
                                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                    <Text className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-xs">{story.followUpNote}</Text>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              color="white"
                              className="flex-shrink-0 ml-3"
                              onClick={() => markFollowUpDone.mutate(story.id)}
                              disabled={markFollowUpDone.isPending}
                            >
                              Mark Done
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Due Today */}
                {followUpsGrouped?.dueToday?.length > 0 && (
                  <div>
                    <Heading level={3} className="mb-3 flex items-center gap-2">
                      <CalendarDaysIcon className="h-5 w-5 text-amber-600" aria-hidden="true" />
                      <span className="text-amber-700 dark:text-amber-400">Due Today</span>
                      <Badge color="amber">{followUpsGrouped.dueToday.length}</Badge>
                    </Heading>
                    <div className="space-y-2">
                      {followUpsGrouped.dueToday.map((story: any) => (
                        <Card key={story.id} className="p-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                              onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                            >
                              <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                              <div className="flex items-center gap-2 mt-1">
                                <Text className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                  {format(new Date(story.followUpDate), 'MMM d')}
                                </Text>
                                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                <Text className="text-sm text-amber-600 dark:text-amber-400">Due today</Text>
                                {story.followUpNote && (
                                  <>
                                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                    <Text className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-xs">{story.followUpNote}</Text>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              color="white"
                              className="flex-shrink-0 ml-3"
                              onClick={() => markFollowUpDone.mutate(story.id)}
                              disabled={markFollowUpDone.isPending}
                            >
                              Mark Done
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Due Soon (1-7 days) */}
                {followUpsGrouped?.dueSoon?.length > 0 && (
                  <div>
                    <Heading level={3} className="mb-3 flex items-center gap-2">
                      <CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />
                      <span className="text-amber-700 dark:text-amber-400">Due Soon</span>
                      <Badge color="zinc">{followUpsGrouped.dueSoon.length}</Badge>
                    </Heading>
                    <div className="space-y-2">
                      {followUpsGrouped.dueSoon.map((story: any) => (
                        <Card key={story.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                              onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                            >
                              <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                              <div className="flex items-center gap-2 mt-1">
                                <Text className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                  {format(new Date(story.followUpDate), 'MMM d')}
                                </Text>
                                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                <Text className="text-sm text-amber-600 dark:text-amber-400">
                                  In {story.daysUntilFollowUp} day{story.daysUntilFollowUp !== 1 ? 's' : ''}
                                </Text>
                                {story.followUpNote && (
                                  <>
                                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                    <Text className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-xs">{story.followUpNote}</Text>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              color="white"
                              className="flex-shrink-0 ml-3"
                              onClick={() => markFollowUpDone.mutate(story.id)}
                              disabled={markFollowUpDone.isPending}
                            >
                              Mark Done
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming */}
                {followUpsGrouped?.upcoming?.length > 0 && (
                  <div>
                    <Heading level={3} className="mb-3 flex items-center gap-2">
                      <CalendarDaysIcon className="h-5 w-5 text-zinc-400" aria-hidden="true" />
                      Upcoming
                      <Badge color="zinc">{followUpsGrouped.upcoming.length}</Badge>
                    </Heading>
                    <div className="space-y-2">
                      {followUpsGrouped.upcoming.map((story: any) => (
                        <Card key={story.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                              onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                            >
                              <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{story.title}</Text>
                              <div className="flex items-center gap-2 mt-1">
                                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                                  {format(new Date(story.followUpDate), 'MMM d')}
                                </Text>
                                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                                  In {story.daysUntilFollowUp} day{story.daysUntilFollowUp !== 1 ? 's' : ''}
                                </Text>
                                {story.followUpNote && (
                                  <>
                                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                    <Text className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-xs">{story.followUpNote}</Text>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              color="white"
                              className="flex-shrink-0 ml-3"
                              onClick={() => markFollowUpDone.mutate(story.id)}
                              disabled={markFollowUpDone.isPending}
                            >
                              Mark Done
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MY WORK SECTION - Stories authored by the user */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Heading level={2}>My Work</Heading>
          </div>

          {/* Work Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              onClick={() => setActiveWorkFilter('all')}
              color={activeWorkFilter === 'all' ? 'primary' : 'white'}
              className="transition-colors"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              All Work
              <Badge color={activeWorkFilter === 'all' ? 'white' : 'zinc'} className="ml-2">
                {draftStories.length + needsReviewStories.length + needsApprovalStories.length + approvedStories.length + publishedStories.length}
              </Badge>
            </Button>
            <Button
              onClick={() => setActiveWorkFilter('drafts')}
              color={activeWorkFilter === 'drafts' ? 'primary' : 'white'}
              className="transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Drafts
              <Badge color={activeWorkFilter === 'drafts' ? 'white' : 'zinc'} className="ml-2">
                {draftStories.length}
              </Badge>
            </Button>
            <Button
              onClick={() => setActiveWorkFilter('in_review')}
              color={activeWorkFilter === 'in_review' ? 'primary' : 'white'}
              className="transition-colors"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              In Review
              <Badge color={activeWorkFilter === 'in_review' ? 'white' : 'amber'} className="ml-2">
                {needsReviewStories.length + needsApprovalStories.length}
              </Badge>
            </Button>
            <Button
              onClick={() => setActiveWorkFilter('approved')}
              color={activeWorkFilter === 'approved' ? 'primary' : 'white'}
              className="transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Approved
              <Badge color={activeWorkFilter === 'approved' ? 'white' : 'green'} className="ml-2">
                {approvedStories.length}
              </Badge>
            </Button>
            <Button
              onClick={() => setActiveWorkFilter('published')}
              color={activeWorkFilter === 'published' ? 'primary' : 'white'}
              className="transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Published
              <Badge color={activeWorkFilter === 'published' ? 'white' : 'blue'} className="ml-2">
                {publishedStories.length}
              </Badge>
            </Button>
          </div>

          {/* Work Content - All Work */}
          {activeWorkFilter === 'all' && (
            <div className="space-y-4">
              {!hasMyWork ? (
                <Card className="p-12">
                  <div className="text-center">
                    <DocumentTextIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No stories yet</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">Start by creating your first story.</Text>
                  </div>
                </Card>
              ) : (
                <>
                  {draftStories.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <PencilIcon className="h-5 w-5" aria-hidden="true" />
                        Drafts
                        <Badge color="zinc">{draftStories.length}</Badge>
                      </Heading>
                      <div className="space-y-2">
                        {draftStories.map((story: any) => (
                          <Card
                            key={story.id}
                            role="button"
                            tabIndex={0}
                            className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                            onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                                    {formatTaskDate(story.updatedAt)}
                                  </Text>
                                </div>
                              </div>
                              <Badge color="zinc">Draft</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {(needsReviewStories.length > 0 || needsApprovalStories.length > 0) && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <ClockIcon className="h-5 w-5" aria-hidden="true" />
                        In Review
                        <Badge color="amber">{needsReviewStories.length + needsApprovalStories.length}</Badge>
                      </Heading>
                      <div className="space-y-2">
                        {needsReviewStories.map((story: any) => (
                          <Card
                            key={story.id}
                            role="button"
                            tabIndex={0}
                            className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                            onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Pending journalist review
                                  </Text>
                                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                  <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                                    {formatTaskDate(story.updatedAt)}
                                  </Text>
                                </div>
                              </div>
                              <Badge color="amber">In Review</Badge>
                            </div>
                          </Card>
                        ))}
                        {needsApprovalStories.map((story: any) => (
                          <Card
                            key={story.id}
                            role="button"
                            tabIndex={0}
                            className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                            onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Pending sub-editor approval
                                  </Text>
                                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                  <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                                    {formatTaskDate(story.updatedAt)}
                                  </Text>
                                </div>
                              </div>
                              <Badge color="blue">Pending Approval</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {approvedStories.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                        Approved
                        <Badge color="green">{approvedStories.length}</Badge>
                      </Heading>
                      <div className="space-y-2">
                        {approvedStories.map((story: any) => (
                          <Card
                            key={story.id}
                            role="button"
                            tabIndex={0}
                            className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                            onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                                    {formatTaskDate(story.updatedAt)}
                                  </Text>
                                </div>
                              </div>
                              <Badge color="green">Approved</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {publishedStories.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                        Published
                        <Badge color="blue">{publishedStories.length}</Badge>
                      </Heading>
                      <div className="space-y-2">
                        {publishedStories.map((story: any) => (
                          <Card
                            key={story.id}
                            role="button"
                            tabIndex={0}
                            className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                            onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                                    {formatTaskDate(story.updatedAt)}
                                  </Text>
                                </div>
                              </div>
                              <Badge color="blue">Published</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Work Content - Drafts */}
          {activeWorkFilter === 'drafts' && (
            <div>
              {draftStories.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <PencilIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No drafts</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">Create a new story to get started.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {draftStories.map((story: any) => (
                      <div
                        key={story.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                              {formatTaskDate(story.updatedAt)}
                            </Text>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Work Content - In Review */}
          {activeWorkFilter === 'in_review' && (
            <div>
              {needsReviewStories.length === 0 && needsApprovalStories.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <ClockIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No stories in review</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">Submit a draft to start the review process.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {needsReviewStories.map((story: any) => (
                      <div
                        key={story.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                              Pending journalist review
                            </Text>
                            <span className="text-zinc-300 dark:text-zinc-600">•</span>
                            <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                              {formatTaskDate(story.updatedAt)}
                            </Text>
                          </div>
                        </div>
                        <Badge color="amber">In Review</Badge>
                      </div>
                    ))}
                    {needsApprovalStories.map((story: any) => (
                      <div
                        key={story.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                              Pending sub-editor approval
                            </Text>
                            <span className="text-zinc-300 dark:text-zinc-600">•</span>
                            <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                              {formatTaskDate(story.updatedAt)}
                            </Text>
                          </div>
                        </div>
                        <Badge color="blue">Pending Approval</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Work Content - Approved */}
          {activeWorkFilter === 'approved' && (
            <div>
              {approvedStories.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <CheckCircleIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No approved stories</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">Stories will appear here once approved.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {approvedStories.map((story: any) => (
                      <div
                        key={story.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                              {formatTaskDate(story.updatedAt)}
                            </Text>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Work Content - Published */}
          {activeWorkFilter === 'published' && (
            <div>
              {publishedStories.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <CheckCircleIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" aria-hidden="true" />
                    <Heading level={3} className="text-zinc-900 dark:text-zinc-100 mb-2">No published stories</Heading>
                    <Text className="text-zinc-600 dark:text-zinc-400">Your published stories will appear here.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {publishedStories.map((story: any) => (
                      <div
                        key={story.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        onKeyDown={handleKeyboardNavigation(() => router.push(`/newsroom/stories/${story.id}`))}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" aria-hidden="true" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Text className="text-sm text-zinc-500 dark:text-zinc-500">
                              {formatTaskDate(story.updatedAt)}
                            </Text>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
