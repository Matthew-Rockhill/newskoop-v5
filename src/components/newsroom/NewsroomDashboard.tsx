import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { PageHeader } from '@/components/ui/page-header';
import { useStories } from '@/hooks/use-stories';
import { useQuery } from '@tanstack/react-query';
import {
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
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
    reviewerId: userId,
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

  // Sub-editor specific: approved stories ready for translation/publishing
  const { data: approvedForPublishingStoriesData } = useStories({
    stage: 'APPROVED',
    page: 1,
    perPage: 100
  });

  // Sub-editor specific: translations pending review
  const { data: pendingTranslationReviewsData } = useQuery({
    queryKey: ['pendingTranslationReviews'],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/translations?status=NEEDS_REVIEW`);
      if (!response.ok) throw new Error('Failed to fetch pending translation reviews');
      const data = await response.json();
      return data.translations || [];
    },
    enabled: isSubEditor,
  });

  const draftStories = draftStoriesData?.stories || [];
  const needsReviewStories = needsReviewStoriesData?.stories || [];
  const needsApprovalStories = needsApprovalStoriesData?.stories || [];
  const publishedStories = publishedStoriesData?.stories || [];
  const reviewStories = reviewStoriesData?.stories || [];
  const pendingApprovalStories = pendingApprovalStoriesData?.stories || [];
  const approvedForPublishingStories = approvedForPublishingStoriesData?.stories || [];
  const pendingTranslationReviews = pendingTranslationReviewsData || [];

  // Quick action cards for different roles
  const quickActions = isSubEditor ? [
    {
      title: 'Stories Needing Approval',
      count: pendingApprovalStories.length,
      icon: CheckCircleIcon,
      href: '/newsroom/stories?stage=NEEDS_SUB_EDITOR_APPROVAL',
      color: 'amber',
    },
    {
      title: 'Translation Reviews',
      count: pendingTranslationReviews.length,
      icon: EyeIcon,
      href: '/newsroom/translations?status=NEEDS_REVIEW',
      color: 'blue',
    },
    {
      title: 'Ready for Publishing',
      count: approvedForPublishingStories.length,
      icon: DocumentTextIcon,
      href: '/newsroom/stories?stage=APPROVED',
      color: 'green',
    },
  ] : isJournalist ? [
    {
      title: 'Stories to Review',
      count: reviewStories.length,
      icon: EyeIcon,
      href: `/newsroom/stories?reviewerId=${userId}&stage=NEEDS_JOURNALIST_REVIEW`,
      color: 'amber',
    },
    {
      title: 'My Drafts',
      count: draftStories.length,
      icon: PencilIcon,
      href: `/newsroom/stories?authorId=${userId}&stage=DRAFT`,
      color: 'blue',
    },
    {
      title: 'My Published Stories',
      count: publishedStories.length,
      icon: CheckCircleIcon,
      href: `/newsroom/stories?authorId=${userId}&stage=PUBLISHED`,
      color: 'green',
    },
  ] : [
    {
      title: 'My Drafts',
      count: draftStories.length,
      icon: PencilIcon,
      href: `/newsroom/stories?authorId=${userId}&stage=DRAFT`,
      color: 'blue',
    },
    {
      title: 'In Review',
      count: needsReviewStories.length + needsApprovalStories.length,
      icon: ClockIcon,
      href: `/newsroom/stories?authorId=${userId}`,
      color: 'amber',
    },
    {
      title: 'My Published Stories',
      count: publishedStories.length,
      icon: CheckCircleIcon,
      href: `/newsroom/stories?authorId=${userId}&stage=PUBLISHED`,
      color: 'green',
    },
  ];

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

      {/* Quick Action Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.title}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(action.href)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">{action.title}</Text>
                  <Heading level={2} className="mt-2">{action.count}</Heading>
                </div>
                <Icon className="h-8 w-8 text-zinc-600" />
              </div>
              <Button color="white" className="w-full mt-4">
                View All
              </Button>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
