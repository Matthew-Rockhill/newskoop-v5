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

export function NewsroomDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;
  const userRole = session?.user?.staffRole;
  const isJournalist = userRole === 'JOURNALIST';
  const isSubEditor = userRole === 'SUB_EDITOR';

  // Fetch stories for the user (stage-based workflow)
  const { data: draftStoriesData } = useStories({ authorId: userId, stage: 'DRAFT', page: 1, perPage: 100 });
  const { data: needsReviewStoriesData } = useStories({
    authorId: userId,
    stage: 'NEEDS_JOURNALIST_REVIEW',
    page: 1,
    perPage: 100
  });
  const { data: needsApprovalStoriesData } = useStories({
    authorId: userId,
    stage: 'NEEDS_SUB_EDITOR_APPROVAL',
    page: 1,
    perPage: 100
  });
  const { data: publishedStoriesData } = useStories({
    authorId: userId,
    stage: 'PUBLISHED',
    page: 1,
    perPage: 100
  });

  // Journalist-specific: stories assigned for review
  const { data: reviewStoriesData } = useStories({
    assignedReviewerId: userId,
    stage: 'NEEDS_JOURNALIST_REVIEW',
    page: 1,
    perPage: 100
  });

  // Sub-editor specific: stories pending approval (submitted by journalists)
  const { data: pendingApprovalStoriesData } = useStories({
    stage: 'NEEDS_SUB_EDITOR_APPROVAL',
    page: 1,
    perPage: 100
  });

  // Sub-editor specific: translated stories ready for publishing
  const { data: approvedForPublishingStoriesData } = useStories({
    stage: 'TRANSLATED',
    page: 1,
    perPage: 100
  });

  // All staff: assigned translation tasks
  const { data: translationTasksData } = useQuery({
    queryKey: ['translationTasks', userId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/stories?authorId=${userId}&isTranslation=true&stage=DRAFT`);
      if (!response.ok) throw new Error('Failed to fetch translation tasks');
      return response.json();
    },
    enabled: !!userId,
  });

  const draftStories = draftStoriesData?.stories || [];
  const needsReviewStories = needsReviewStoriesData?.stories || [];
  const needsApprovalStories = needsApprovalStoriesData?.stories || [];
  const publishedStories = publishedStoriesData?.stories || [];
  const reviewStories = reviewStoriesData?.stories || [];
  const pendingApprovalStories = pendingApprovalStoriesData?.stories || [];
  const approvedForPublishingStories = approvedForPublishingStoriesData?.stories || [];
  const translationTasks = translationTasksData?.stories || [];

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
        {/* MY WORK SECTION */}
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

        {/* EDITORIAL TASKS SECTION */}
        {(isJournalist || isSubEditor) && (
          <div>
            <Heading level={2} className="mb-4">Editorial Tasks</Heading>
            <div className="space-y-4">
              {/* Stories to Review (Journalist) */}
              {isJournalist && reviewStories.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <EyeIcon className="h-5 w-5 text-amber-600" />
                      <Heading level={3}>Stories to Review</Heading>
                    </div>
                    <Text className="text-sm text-zinc-600">{reviewStories.length}</Text>
                  </div>
                  <div className="space-y-2">
                    {reviewStories.slice(0, 5).map((story: any) => (
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
                    {reviewStories.length > 5 && (
                      <Button
                        color="white"
                        className="w-full mt-2"
                        onClick={() => router.push(`/newsroom/stories?assignedReviewerId=${userId}&stage=NEEDS_JOURNALIST_REVIEW`)}
                      >
                        View all {reviewStories.length} stories
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              {/* Stories Needing Approval (Sub-Editor) */}
              {isSubEditor && pendingApprovalStories.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="h-5 w-5 text-amber-600" />
                      <Heading level={3}>Stories Needing Approval</Heading>
                    </div>
                    <Text className="text-sm text-zinc-600">{pendingApprovalStories.length}</Text>
                  </div>
                  <div className="space-y-2">
                    {pendingApprovalStories.slice(0, 5).map((story: any) => (
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
                    {pendingApprovalStories.length > 5 && (
                      <Button
                        color="white"
                        className="w-full mt-2"
                        onClick={() => router.push('/newsroom/stories?stage=NEEDS_SUB_EDITOR_APPROVAL')}
                      >
                        View all {pendingApprovalStories.length} stories
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              {/* Translation Tasks (Journalist/Sub-Editor assigned as translator) */}
              {translationTasks.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <DocumentTextIcon className="h-5 w-5 text-purple-600" />
                      <Heading level={3}>Translations to Complete</Heading>
                    </div>
                    <Text className="text-sm text-zinc-600">{translationTasks.length}</Text>
                  </div>
                  <div className="space-y-2">
                    {translationTasks.slice(0, 5).map((story: any) => (
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
                    {translationTasks.length > 5 && (
                      <Button
                        color="white"
                        className="w-full mt-2"
                        onClick={() => router.push(`/newsroom/stories?authorId=${userId}&isTranslation=true&stage=DRAFT`)}
                      >
                        View all {translationTasks.length} translations
                      </Button>
                    )}
                  </div>
                </Card>
              )}

            </div>
          </div>
        )}

        {/* PUBLISHING SECTION */}
        {isSubEditor && approvedForPublishingStories.length > 0 && (
          <div>
            <Heading level={2} className="mb-4">Publishing</Heading>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-5 w-5 text-green-600" />
                  <Heading level={3}>Ready for Publishing</Heading>
                </div>
                <Text className="text-sm text-zinc-600">{approvedForPublishingStories.length}</Text>
              </div>
              <div className="space-y-2">
                {approvedForPublishingStories.slice(0, 5).map((story: any) => (
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
                {approvedForPublishingStories.length > 5 && (
                  <Button
                    color="white"
                    className="w-full mt-2"
                    onClick={() => router.push('/newsroom/stories?stage=TRANSLATED')}
                  >
                    View all {approvedForPublishingStories.length} stories
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Container>
  );
}
