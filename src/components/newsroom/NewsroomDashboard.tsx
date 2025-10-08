import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { useStories } from '@/hooks/use-stories';
import { useQuery } from '@tanstack/react-query';
import {
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

type TaskFilter = 'all' | 'review' | 'approve' | 'translate' | 'publish';

export function NewsroomDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;
  const userRole = session?.user?.staffRole;
  const isJournalist = userRole === 'JOURNALIST';
  const isSubEditor = userRole === 'SUB_EDITOR';

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

  // Fetch stories for the user (stage-based workflow) - lazy load based on active filter
  const { data: draftStoriesData } = useStories({
    authorId: userId,
    stage: 'DRAFT',
    page: 1,
    perPage: 20
  }, { enabled: !!userId });

  const { data: needsReviewStoriesData } = useStories({
    authorId: userId,
    stage: 'NEEDS_JOURNALIST_REVIEW',
    page: 1,
    perPage: 20
  }, { enabled: !!userId });

  const { data: needsApprovalStoriesData } = useStories({
    authorId: userId,
    stage: 'NEEDS_SUB_EDITOR_APPROVAL',
    page: 1,
    perPage: 20
  }, { enabled: !!userId });

  const { data: approvedStoriesData } = useStories({
    authorId: userId,
    stage: 'APPROVED',
    page: 1,
    perPage: 20
  }, { enabled: !!userId });

  const { data: publishedStoriesData } = useStories({
    authorId: userId,
    stage: 'PUBLISHED',
    page: 1,
    perPage: 20
  }, { enabled: !!userId });

  // Journalist-specific: stories assigned for review - only load when needed
  const { data: reviewStoriesData } = useStories({
    assignedReviewerId: userId,
    stage: 'NEEDS_JOURNALIST_REVIEW',
    page: 1,
    perPage: 20
  }, { enabled: !!userId && (activeTaskFilter === 'all' || activeTaskFilter === 'review') });

  // Sub-editor specific: stories pending approval - only load when needed
  const { data: pendingApprovalStoriesData } = useStories({
    stage: 'NEEDS_SUB_EDITOR_APPROVAL',
    page: 1,
    perPage: 20
  }, { enabled: !!userId && (activeTaskFilter === 'all' || activeTaskFilter === 'approve') });

  // Sub-editor specific: translated stories ready for publishing - only load when needed
  const { data: approvedForPublishingStoriesData } = useStories({
    stage: 'TRANSLATED',
    page: 1,
    perPage: 20
  }, { enabled: !!userId && (activeTaskFilter === 'all' || activeTaskFilter === 'publish') });

  // All staff: assigned translation tasks - only load when needed
  const { data: translationTasksData } = useQuery({
    queryKey: ['translationTasks', userId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/stories?authorId=${userId}&isTranslation=true&stage=DRAFT&perPage=20`);
      if (!response.ok) throw new Error('Failed to fetch translation tasks');
      return response.json();
    },
    enabled: !!userId && (activeTaskFilter === 'all' || activeTaskFilter === 'translate'),
  });

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
        action={!isSubEditor ? {
          label: "Create Story",
          onClick: () => router.push('/newsroom/stories/new')
        } : undefined}
      />

      <div className="mt-8 space-y-8">
        {/* MY WORK SECTION - Only show if user has work */}
        {hasMyWork && (
          <div>
            <Heading level={2} className="mb-4">My Work</Heading>
          <div className="space-y-4">
            {/* My Drafts */}
            {draftStories.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <PencilIcon className="h-5 w-5 text-blue-600" />
                    <Heading level={3}>My Drafts</Heading>
                  </div>
                  <Text className="text-sm text-zinc-600">{draftStories.length}</Text>
                </div>
                <div className="space-y-2">
                  {draftStories.slice(0, 5).map((story: any) => (
                    <div
                      key={story.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                          {story._count?.audioClips > 0 && (
                            <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {draftStories.length > 5 && (
                    <Button
                      color="white"
                      className="w-full mt-2"
                      onClick={() => router.push(`/newsroom/stories?authorId=${userId}&stage=DRAFT`)}
                    >
                      View all {draftStories.length} drafts
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Stories in Review (Intern) */}
            {!isJournalist && !isSubEditor && (needsReviewStories.length > 0 || needsApprovalStories.length > 0) && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-5 w-5 text-amber-600" />
                    <Heading level={3}>Stories in Review</Heading>
                  </div>
                  <Text className="text-sm text-zinc-600">{needsReviewStories.length + needsApprovalStories.length}</Text>
                </div>
                <div className="space-y-2">
                  {[...needsReviewStories, ...needsApprovalStories].slice(0, 5).map((story: any) => (
                    <div
                      key={story.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                          {story._count?.audioClips > 0 && (
                            <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                          )}
                        </div>
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                          {story.stage === 'NEEDS_JOURNALIST_REVIEW'
                            ? `Being reviewed by ${story.assignedReviewer?.firstName || 'journalist'}`
                            : 'Awaiting sub-editor approval'}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Approved Stories */}
            {approvedStories.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                    <Heading level={3}>Approved Stories</Heading>
                  </div>
                  <Text className="text-sm text-zinc-600">{approvedStories.length}</Text>
                </div>
                <div className="space-y-2">
                  {approvedStories.slice(0, 5).map((story: any) => (
                    <div
                      key={story.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                          {story._count?.audioClips > 0 && (
                            <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                          )}
                        </div>
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Ready for translation</Text>
                      </div>
                    </div>
                  ))}
                  {approvedStories.length > 5 && (
                    <Button
                      color="white"
                      className="w-full mt-2"
                      onClick={() => router.push(`/newsroom/stories?authorId=${userId}&stage=APPROVED`)}
                    >
                      View all {approvedStories.length} stories
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* My Published Stories */}
            {publishedStories.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <Heading level={3}>My Published Stories</Heading>
                  </div>
                  <Text className="text-sm text-zinc-600">{publishedStories.length}</Text>
                </div>
                <div className="space-y-2">
                  {publishedStories.slice(0, 5).map((story: any) => (
                    <div
                      key={story.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                          {story._count?.audioClips > 0 && (
                            <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {publishedStories.length > 5 && (
                    <Button
                      color="white"
                      className="w-full mt-2"
                      onClick={() => router.push(`/newsroom/stories?authorId=${userId}&stage=PUBLISHED`)}
                    >
                      View all {publishedStories.length} stories
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
          </div>
        )}

        {/* MY TASKS SECTION - Always visible with filters */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Heading level={2}>My Tasks</Heading>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => setActiveTaskFilter('all')}
              color={activeTaskFilter === 'all' ? 'primary' : 'white'}
              className="transition-colors"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              All Tasks ({reviewStories.length + pendingApprovalStories.length + translationTasks.length + approvedForPublishingStories.length})
            </Button>
            {availableFilters.includes('review') && (
              <Button
                onClick={() => setActiveTaskFilter('review')}
                color={activeTaskFilter === 'review' ? 'primary' : 'white'}
                className="transition-colors"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                Review ({reviewStories.length})
              </Button>
            )}
            {availableFilters.includes('approve') && (
              <Button
                onClick={() => setActiveTaskFilter('approve')}
                color={activeTaskFilter === 'approve' ? 'primary' : 'white'}
                className="transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Approve ({pendingApprovalStories.length})
              </Button>
            )}
            {availableFilters.includes('translate') && (
              <Button
                onClick={() => setActiveTaskFilter('translate')}
                color={activeTaskFilter === 'translate' ? 'primary' : 'white'}
                className="transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Translate ({translationTasks.length})
              </Button>
            )}
            {availableFilters.includes('publish') && (
              <Button
                onClick={() => setActiveTaskFilter('publish')}
                color={activeTaskFilter === 'publish' ? 'primary' : 'white'}
                className="transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Publish ({approvedForPublishingStories.length})
              </Button>
            )}
          </div>

          {/* Task Content - All Tasks */}
          {activeTaskFilter === 'all' && (
            <div className="space-y-4">
              {reviewStories.length === 0 && pendingApprovalStories.length === 0 && translationTasks.length === 0 && approvedForPublishingStories.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <Heading level={3} className="text-gray-900 dark:text-gray-100 mb-2">No tasks</Heading>
                    <Text className="text-gray-600 dark:text-gray-400">Great work! You're all caught up.</Text>
                  </div>
                </Card>
              ) : (
                <>
                  {reviewStories.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <EyeIcon className="h-5 w-5" />
                        Review Tasks ({reviewStories.length})
                      </Heading>
                      <div className="space-y-2">
                        {reviewStories.map((story: any) => (
                          <Card key={story.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => router.push(`/newsroom/stories/${story.id}`)}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-gray-900 dark:text-gray-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" />
                                  )}
                                </div>
                                <Text className="text-sm text-gray-600 dark:text-gray-400">
                                  By {story.author?.firstName} {story.author?.lastName}
                                </Text>
                              </div>
                              <Badge color="amber">Review</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingApprovalStories.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5" />
                        Approval Tasks ({pendingApprovalStories.length})
                      </Heading>
                      <div className="space-y-2">
                        {pendingApprovalStories.map((story: any) => (
                          <Card key={story.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => router.push(`/newsroom/stories/${story.id}`)}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-gray-900 dark:text-gray-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" />
                                  )}
                                </div>
                                <Text className="text-sm text-gray-600 dark:text-gray-400">
                                  By {story.author?.firstName} {story.author?.lastName}
                                </Text>
                              </div>
                              <Badge color="blue">Approve</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {translationTasks.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5" />
                        Translation Tasks ({translationTasks.length})
                      </Heading>
                      <div className="space-y-2">
                        {translationTasks.map((story: any) => (
                          <Card key={story.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => router.push(`/newsroom/stories/${story.id}/translate`)}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-gray-900 dark:text-gray-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" />
                                  )}
                                </div>
                                <Text className="text-sm text-gray-600 dark:text-gray-400">
                                  {story.language} translation
                                </Text>
                              </div>
                              <Badge color="purple">Translate</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {approvedForPublishingStories.length > 0 && (
                    <div>
                      <Heading level={3} className="mb-3 flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5" />
                        Publishing Tasks ({approvedForPublishingStories.length})
                      </Heading>
                      <div className="space-y-2">
                        {approvedForPublishingStories.map((story: any) => (
                          <Card key={story.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => router.push(`/newsroom/stories/${story.id}`)}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium text-gray-900 dark:text-gray-100">{story.title}</Text>
                                  {story._count?.audioClips > 0 && (
                                    <MusicalNoteIcon className="h-4 w-4 text-kelly-green" />
                                  )}
                                </div>
                                <Text className="text-sm text-gray-600 dark:text-gray-400">
                                  Ready to publish
                                </Text>
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
                    <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <Heading level={3} className="text-gray-900 dark:text-gray-100 mb-2">No review tasks</Heading>
                    <Text className="text-gray-600 dark:text-gray-400">Great work! You're all caught up on reviews.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {reviewStories.map((story: any) => (
                      <div
                        key={story.id}
                        className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                            )}
                          </div>
                          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            by {story.author.firstName} {story.author.lastName}
                          </Text>
                        </div>
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
                    <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <Heading level={3} className="text-gray-900 dark:text-gray-100 mb-2">No approval tasks</Heading>
                    <Text className="text-gray-600 dark:text-gray-400">Great work! You're all caught up on approvals.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {pendingApprovalStories.map((story: any) => (
                      <div
                        key={story.id}
                        className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                            )}
                          </div>
                          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            by {story.author.firstName} {story.author.lastName}
                          </Text>
                        </div>
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
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <Heading level={3} className="text-gray-900 dark:text-gray-100 mb-2">No translation tasks</Heading>
                    <Text className="text-gray-600 dark:text-gray-400">No translations assigned to you at the moment.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {translationTasks.map((story: any) => (
                      <div
                        key={story.id}
                        className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                            {story.language && (
                              <Badge color="purple">{story.language}</Badge>
                            )}
                            {story._count?.audioClips > 0 && (
                              <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                            )}
                          </div>
                          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            Translation not yet started
                          </Text>
                        </div>
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
                    <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <Heading level={3} className="text-gray-900 dark:text-gray-100 mb-2">No stories ready to publish</Heading>
                    <Text className="text-gray-600 dark:text-gray-400">All translated stories have been published.</Text>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="space-y-2">
                    {approvedForPublishingStories.map((story: any) => (
                  <div
                    key={story.id}
                    className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Text className="font-medium text-zinc-900 dark:text-zinc-100">{story.title}</Text>
                        {story._count?.audioClips > 0 && (
                          <MusicalNoteIcon className="h-4 w-4 text-kelly-green flex-shrink-0" title={`${story._count.audioClips} audio ${story._count.audioClips === 1 ? 'clip' : 'clips'}`} />
                        )}
                      </div>
                      <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                        by {story.author.firstName} {story.author.lastName}
                      </Text>
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
