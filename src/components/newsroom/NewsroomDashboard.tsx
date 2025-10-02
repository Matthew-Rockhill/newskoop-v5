import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Container } from '@/components/ui/container';
import { StatsCard } from '@/components/ui/stats-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { PageHeader } from '@/components/ui/page-header';
import { useStories, type Story } from '@/hooks/use-stories';
import { useQuery } from '@tanstack/react-query';
import { StoryPipelineView } from './StoryPipelineView';
import { 
  PlusIcon,
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  EyeIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export function NewsroomDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;
  const userRole = session?.user?.staffRole;
  const isJournalist = userRole === 'JOURNALIST';
  const isSubEditor = userRole === 'SUB_EDITOR';

  // Fetch stories for the user
  const { data: allStoriesData } = useStories({ authorId: userId, page: 1, perPage: 100 });
  const { data: draftStoriesData } = useStories({ authorId: userId, status: 'DRAFT', page: 1, perPage: 100 });
  const { data: submittedStoriesData } = useStories({ 
    authorId: userId, 
    status: 'IN_REVIEW', 
    page: 1, 
    perPage: 100 
  });
  const { data: rejectedStoriesData } = useStories({
    authorId: userId,
    status: 'NEEDS_REVISION',
    page: 1,
    perPage: 100
  });
  const { data: publishedStoriesData } = useStories({ 
    authorId: userId, 
    status: 'PUBLISHED', 
    page: 1, 
    perPage: 100 
  });
  
  // Journalist-specific: stories assigned for review
  const { data: reviewStoriesData } = useStories({ 
    reviewerId: userId, 
    status: 'IN_REVIEW', 
    page: 1, 
    perPage: 100 
  });
  
  // Journalist-specific: stories submitted for approval
  // For journalists, this will include both their own stories AND stories they reviewed/submitted for approval
  const { data: approvedStoriesData } = useStories({ 
    status: 'PENDING_APPROVAL', 
    page: 1, 
    perPage: 100 
  });
  
  // Sub-editor specific: stories pending approval (submitted by journalists)
  const { data: pendingApprovalStoriesData } = useStories({ 
    status: 'PENDING_APPROVAL', 
    page: 1, 
    perPage: 100 
  });
  
  // Sub-editor specific: approved stories ready for pre-publishing
  const { data: approvedForPublishingStoriesData } = useStories({ 
    status: 'APPROVED', 
    page: 1, 
    perPage: 100 
  });

  // Editor/Sub-editor specific: stories with follow-up dates
  const { data: followUpStoriesData } = useQuery({
    queryKey: ['followUpStories'],
    queryFn: async () => {
      const response = await fetch('/api/newsroom/stories/follow-ups');
      if (!response.ok) throw new Error('Failed to fetch follow-up stories');
      return response.json();
    },
    enabled: isSubEditor || userRole === 'EDITOR',
  });

  // Fetch translations assigned to the user
  const { data: assignedTranslationsData } = useQuery({
    queryKey: ['assignedTranslations', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/newsroom/translations?assignedToId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch assigned translations');
      const data = await response.json();
      return data.translations || [];
    },
    enabled: !!userId,
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

  const assignedTranslations = assignedTranslationsData || [];
  const pendingTranslationReviews = pendingTranslationReviewsData || [];

  // Filter translations by status for the assigned user
  const inProgressTranslations = assignedTranslations.filter((t: any) => t.status === 'IN_PROGRESS');
  const needsReviewTranslations = assignedTranslations.filter((t: any) => t.status === 'NEEDS_REVIEW');
  const approvedTranslations = assignedTranslations.filter((t: any) => t.status === 'APPROVED');

  const allStories = allStoriesData?.stories || [];
  const draftStories = draftStoriesData?.stories || [];
  const submittedStories = submittedStoriesData?.stories || [];
  const rejectedStories = rejectedStoriesData?.stories || [];
  const publishedStories = publishedStoriesData?.stories || [];
  const reviewStories = reviewStoriesData?.stories || [];
  const approvedStories = approvedStoriesData?.stories || [];
  const pendingApprovalStories = pendingApprovalStoriesData?.stories || [];
  const approvedForPublishingStories = approvedForPublishingStoriesData?.stories || [];
  const followUpStories = followUpStoriesData?.grouped || { overdue: [], dueToday: [], dueSoon: [], upcoming: [] };
  const totalFollowUps = followUpStoriesData?.total || 0;

  // Calculate success metrics
  const totalStories = allStories.length;
  const publishedCount = publishedStories.length;
  const acceptanceRate = totalStories > 0 ? Math.round((publishedCount / totalStories) * 100) : 0;
  const rejectedCount = rejectedStories.length;
  const inPipelineCount = submittedStories.length;
  const reviewCount = reviewStories.length;
  const approvedCount = approvedStories.length;

  // Calculate average time from draft to published (simplified)
  const avgTimeToPublish = "3.2 days"; // This would need proper calculation

  const successMetrics = isSubEditor ? [
    {
      name: 'Pending Story Approval',
      value: pendingApprovalStories.length,
      description: 'Stories awaiting fact-check and approval',
      change: pendingApprovalStories.length > 5 ? 'High workload' : pendingApprovalStories.length > 2 ? 'Moderate' : 'Clear',
      changeType: pendingApprovalStories.length > 5 ? 'negative' as const : pendingApprovalStories.length > 2 ? 'neutral' as const : 'positive' as const,
    },
    {
      name: 'Translation Reviews',
      value: pendingTranslationReviews.length,
      description: 'Translations awaiting review',
      change: pendingTranslationReviews.length > 3 ? 'High workload' : pendingTranslationReviews.length > 1 ? 'Moderate' : 'Clear',
      changeType: pendingTranslationReviews.length > 3 ? 'negative' as const : pendingTranslationReviews.length > 1 ? 'neutral' as const : 'positive' as const,
    },
    {
      name: 'Ready for Publishing',
      value: approvedForPublishingStories.length,
      description: 'Approved stories ready for publishing',
    },
    {
      name: 'Total Workflow Items',
      value: pendingApprovalStories.length + pendingTranslationReviews.length + approvedForPublishingStories.length,
      description: 'Stories and translations in your workflow',
    },
  ] : isJournalist ? [
    {
      name: 'Stories Published',
      value: publishedCount,
      description: 'Total published stories',
      change: acceptanceRate >= 80 ? 'Excellent!' : acceptanceRate >= 60 ? 'Good work' : 'Keep improving',
      changeType: acceptanceRate >= 80 ? 'positive' as const : acceptanceRate >= 60 ? 'neutral' as const : 'negative' as const,
    },
    {
      name: 'Approval Rate',
      value: `${acceptanceRate}%`,
      description: 'Stories submitted for approval',
      change: acceptanceRate >= 80 ? '+5% this month' : acceptanceRate >= 60 ? 'Stable' : 'Needs improvement',
      changeType: acceptanceRate >= 80 ? 'positive' as const : acceptanceRate >= 60 ? 'neutral' as const : 'negative' as const,
    },
    {
      name: 'Pending Reviews',
      value: reviewCount,
      description: 'Intern stories to review',
    },
    {
      name: 'Submitted for Approval',
      value: approvedCount,
      description: 'Stories sent to sub-editors',
    },
  ] : [
    {
      name: 'Stories Published',
      value: publishedCount,
      description: 'Total published stories',
      change: acceptanceRate >= 80 ? 'Excellent!' : acceptanceRate >= 60 ? 'Good work' : 'Keep improving',
      changeType: acceptanceRate >= 80 ? 'positive' as const : acceptanceRate >= 60 ? 'neutral' as const : 'negative' as const,
    },
    {
      name: 'Acceptance Rate',
      value: `${acceptanceRate}%`,
      description: 'Stories accepted vs submitted',
      change: acceptanceRate >= 80 ? '+5% this month' : acceptanceRate >= 60 ? 'Stable' : 'Needs improvement',
      changeType: acceptanceRate >= 80 ? 'positive' as const : acceptanceRate >= 60 ? 'neutral' as const : 'negative' as const,
    },
    {
      name: 'Avg. Time to Publish',
      value: avgTimeToPublish,
      description: 'From draft to published',
    },
    {
      name: 'Stories in Pipeline',
      value: inPipelineCount,
      description: 'Currently being reviewed',
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container>
      <PageHeader
        title="My Dashboard"
        description={`Welcome back, ${session?.user?.firstName || (isSubEditor ? 'Sub-Editor' : isJournalist ? 'Journalist' : 'Intern')}! Here's your ${isSubEditor ? 'editorial review and approval' : isJournalist ? 'writing and review' : 'writing'} progress.`}
        action={!isSubEditor ? {
          label: "Create Story",
          onClick: () => router.push('/newsroom/stories/new')
        } : undefined}
        actions={
          <div className="flex flex-wrap gap-3">
            {!isSubEditor && (
            <Button
              color="white"
              onClick={() => router.push('/newsroom/stories?authorId=' + userId)}
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
                View {isJournalist ? 'My' : 'All My'} Stories
              </Button>
            )}
            {isSubEditor && pendingApprovalStories.length > 0 && (
              <Button
                color="white"
                onClick={() => router.push('/newsroom/stories?status=PENDING_APPROVAL')}
              >
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Review Pending Approval ({pendingApprovalStories.length})
            </Button>
            )}
            {isSubEditor && pendingTranslationReviews.length > 0 && (
              <Button
                color="white"
                onClick={() => router.push('/newsroom/translations?status=NEEDS_REVIEW')}
              >
                <UserGroupIcon className="h-4 w-4 mr-2" />
                Review Translations ({pendingTranslationReviews.length})
              </Button>
            )}
            {!isJournalist && !isSubEditor && rejectedCount > 0 && (
              <Button
                color="white"
                onClick={() => router.push('/newsroom/stories?status=NEEDS_REVISION&authorId=' + userId)}
              >
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Fix Rejected Stories ({rejectedCount})
              </Button>
            )}
            {isJournalist && reviewCount > 0 && (
              <Button
                color="white"
                onClick={() => router.push('/newsroom/stories?reviewerId=' + userId + '&status=IN_REVIEW')}
              >
                <UserGroupIcon className="h-4 w-4 mr-2" />
                Review Stories ({reviewCount})
              </Button>
            )}
          </div>
        }
      />

      {/* Success Metrics */}
      <div className="mt-8">
        <StatsCard stats={successMetrics} />
      </div>

      {/* Story Pipeline View - All Editorial Roles */}
      <div className="mt-8">
        <StoryPipelineView />
      </div>

      {/* Sub-Editor Specific Sections */}
      {isSubEditor && (
        <>
          {/* Follow-up Stories Section */}
          {totalFollowUps > 0 && (
            <div className="mt-8">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level={3}>Story Follow-ups</Heading>
                  <div className="flex items-center space-x-2">
                    {followUpStories.overdue.length > 0 && (
                      <Badge color="red">{followUpStories.overdue.length} Overdue</Badge>
                    )}
                    {followUpStories.dueToday.length > 0 && (
                      <Badge color="amber">{followUpStories.dueToday.length} Due Today</Badge>
                    )}
                    {followUpStories.dueSoon.length > 0 && (
                      <Badge color="blue">{followUpStories.dueSoon.length} Due Soon</Badge>
                    )}
                  </div>
                </div>
                <Text className="text-gray-600 mb-4">
                  Stories scheduled for follow-up review and updates
                </Text>
                
                <div className="space-y-4">
                  {/* Overdue Follow-ups */}
                  {followUpStories.overdue.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-700 mb-2">Overdue Follow-ups</h4>
                      <div className="space-y-2">
                        {followUpStories.overdue.slice(0, 3).map((story: any) => (
                          <div key={story.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{story.title}</h5>
                              <div className="flex items-center space-x-2 text-sm text-red-600">
                                <CalendarDaysIcon className="h-4 w-4" />
                                <span>Due: {new Date(story.followUpDate).toLocaleDateString()}</span>
                                <span className="text-red-700 font-medium">({Math.abs(story.daysUntilFollowUp)} days overdue)</span>
                                {story.followUpNote && <span className="text-gray-600">• {story.followUpNote}</span>}
                              </div>
                            </div>
                            <Button
                              color="red"
                              onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Due Today */}
                  {followUpStories.dueToday.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-700 mb-2">Due Today</h4>
                      <div className="space-y-2">
                        {followUpStories.dueToday.slice(0, 3).map((story: any) => (
                          <div key={story.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{story.title}</h5>
                              <div className="flex items-center space-x-2 text-sm text-amber-600">
                                <CalendarDaysIcon className="h-4 w-4" />
                                <span>Follow-up due today</span>
                                {story.followUpNote && <span className="text-gray-600">• {story.followUpNote}</span>}
                              </div>
                            </div>
                            <Button
                              color="white"
                              onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Due Soon */}
                  {followUpStories.dueSoon.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-700 mb-2">Due Soon (Next 7 Days)</h4>
                      <div className="space-y-2">
                        {followUpStories.dueSoon.slice(0, 3).map((story: any) => (
                          <div key={story.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{story.title}</h5>
                              <div className="flex items-center space-x-2 text-sm text-blue-600">
                                <CalendarDaysIcon className="h-4 w-4" />
                                <span>Due: {new Date(story.followUpDate).toLocaleDateString()}</span>
                                <span className="text-gray-600">({story.daysUntilFollowUp} days)</span>
                                {story.followUpNote && <span className="text-gray-600">• {story.followUpNote}</span>}
                              </div>
                            </div>
                            <Button
                              color="white"
                              onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* View All Button */}
                  {totalFollowUps > 9 && (
                    <Button
                      color="white"
                      className="w-full"
                      onClick={() => router.push('/newsroom/stories/follow-ups')}
                    >
                      View all {totalFollowUps} follow-up stories
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Pending Approval Section */}
          <div className="mt-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Heading level={3}>Pending Approval</Heading>
                <Badge color="blue">{pendingApprovalStories.length}</Badge>
              </div>
              <Text className="text-gray-600 mb-4">
                Stories submitted by journalists awaiting fact-check and approval
              </Text>
              
              {pendingApprovalStories.length > 0 ? (
                <div className="space-y-3">
                  {pendingApprovalStories.slice(0, 5).map((story: Story) => (
                    <div key={story.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{story.title}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <ClockIcon className="h-4 w-4" />
                          <span>Submitted {formatDate(story.updatedAt)} by {story.author.firstName} {story.author.lastName}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          color="white"
                          onClick={() => router.push(`/newsroom/stories/${story.id}/review`)}
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingApprovalStories.length > 5 && (
                    <Button
                      color="white"
                      className="w-full"
                      onClick={() => router.push('/newsroom/stories?status=PENDING_APPROVAL')}
                    >
                      View all {pendingApprovalStories.length} pending approval
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <Text className="text-gray-500">No stories pending approval</Text>
                </div>
              )}
            </Card>
          </div>

          {/* Ready for Publishing Section */}
          <div className="mt-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Heading level={3}>Ready for Publishing</Heading>
                <Badge color="green">{approvedForPublishingStories.length}</Badge>
              </div>
              <Text className="text-gray-600 mb-4">
                Approved stories ready for translation and publishing
              </Text>
              
              {approvedForPublishingStories.length > 0 ? (
                <div className="space-y-3">
                  {approvedForPublishingStories.slice(0, 5).map((story: Story) => (
                    <div key={story.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{story.title}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>Approved {formatDate(story.updatedAt)}</span>
                          <span>• Author: {story.author.firstName} {story.author.lastName}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          color="white"
                          onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          onClick={() => router.push(`/newsroom/stories/${story.id}/publish`)}
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Publish
                        </Button>
                      </div>
                    </div>
                  ))}
                  {approvedForPublishingStories.length > 5 && (
                    <Button
                      color="white"
                      className="w-full"
                      onClick={() => router.push('/newsroom/stories?status=APPROVED')}
                    >
                      View all {approvedForPublishingStories.length} ready for publishing
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <Text className="text-gray-500">No stories ready for publishing</Text>
                </div>
              )}
            </Card>
          </div>

          {/* Translation Review Section - Sub-Editors Only */}
          {pendingTranslationReviews.length > 0 && (
            <div className="mt-8">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level={3}>Translation Reviews</Heading>
                  <Badge color="amber">{pendingTranslationReviews.length}</Badge>
                </div>
                <Text className="text-gray-600 mb-4">
                  Translations submitted by translators awaiting quality review
                </Text>
                
                <div className="space-y-3">
                  {pendingTranslationReviews.slice(0, 5).map((translation: any) => (
                    <div key={translation.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {translation.originalStory?.title} ({translation.targetLanguage})
                        </h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <ClockIcon className="h-4 w-4" />
                          <span>Submitted {formatDate(translation.updatedAt)} by {translation.assignedTo?.firstName} {translation.assignedTo?.lastName}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          color="white"
                          onClick={() => router.push(`/newsroom/translations/${translation.id}/review`)}
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingTranslationReviews.length > 5 && (
                    <Button
                      color="white"
                      className="w-full"
                      onClick={() => router.push('/newsroom/translations?status=NEEDS_REVIEW')}
                    >
                      View all {pendingTranslationReviews.length} pending translation reviews
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Pending Reviews Section - Journalists Only */}
      {isJournalist && (
        <div className="mt-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3}>Pending Reviews</Heading>
              <Badge color="yellow">{reviewCount}</Badge>
            </div>
            <Text className="text-gray-600 mb-4">
              Stories submitted by interns waiting for your review
            </Text>
            
            {reviewCount > 0 ? (
              <div className="space-y-3">
                {reviewStories.slice(0, 5).map((story: Story) => (
                  <div key={story.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{story.title}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4" />
                        <span>Submitted {formatDate(story.updatedAt)} by {story.author.firstName} {story.author.lastName}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        color="white"
                        onClick={() => router.push(`/newsroom/stories/${story.id}/review`)}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
                {reviewCount > 5 && (
                  <Button
                    color="white"
                    className="w-full"
                    onClick={() => router.push('/newsroom/stories?reviewerId=' + userId + '&status=IN_REVIEW')}
                  >
                    View all {reviewCount} pending reviews
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <Text className="text-gray-500">No pending reviews</Text>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Revision Requests Section - Interns Only */}
      {!isJournalist && !isSubEditor && (
        <div className="mt-8">
          <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3}>Revision Requests</Heading>
            <Badge color="red">{rejectedCount}</Badge>
          </div>
          <Text className="text-gray-600 mb-4">
            Stories that need revision based on reviewer feedback
          </Text>
          
          {rejectedCount > 0 ? (
            <div className="space-y-3">
              {rejectedStories.slice(0, 5).map((story: Story) => (
                <div key={story.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{story.title}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span>Revision requested {formatDate(story.updatedAt)}</span>
                      {story.reviewer && (
                        <span>• Reviewer: {story.reviewer.firstName} {story.reviewer.lastName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      color="white"
                      onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </Button>
                                  <Button
                  onClick={() => router.push(`/newsroom/stories/${story.id}/edit`)}
                >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Revise
                  </Button>
                  </div>
                </div>
              ))}
              {rejectedCount > 5 && (
                <Button
                  color="white"
                  className="w-full"
                  onClick={() => router.push('/newsroom/stories?status=NEEDS_REVISION&authorId=' + userId)}
                >
                  View all {rejectedCount} revision requests
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <Text className="text-gray-500">No revision requests</Text>
            </div>
          )}
          </Card>
        </div>
      )}

      {/* Regular User Sections - Hide for Sub-Editors */}
      {!isSubEditor && (
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Drafts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3}>My Drafts</Heading>
            <Badge color="zinc">{draftStories.length}</Badge>
          </div>
          <Text className="text-gray-600 mb-4">
            Stories you&apos;re currently working on
          </Text>
          
          {draftStories.length > 0 ? (
            <div className="space-y-3">
              {draftStories.slice(0, 5).map((story: Story) => (
                <div key={story.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{story.title}</h4>
                    <p className="text-sm text-gray-600">
                      Last edited {formatDate(story.updatedAt)}
                    </p>
                  </div>
                  <Button
                    color="white"
                    onClick={() => router.push(`/newsroom/stories/${story.id}/edit`)}
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Continue
                  </Button>
                </div>
              ))}
              {draftStories.length > 5 && (
                <Button
                  color="white"
                  className="w-full"
                  onClick={() => router.push('/newsroom/stories?status=DRAFT')}
                >
                  View all {draftStories.length} drafts
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <Text className="text-gray-500">No drafts yet</Text>
                              <Button
                  className="mt-2"
                  onClick={() => router.push('/newsroom/stories/new')}
                >
                Create your first story
              </Button>
            </div>
          )}
        </Card>

        {/* Submitted Stories - Interns Only */}
        {!isJournalist ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3}>Submitted Stories</Heading>
            <Badge color="yellow">{submittedStories.length}</Badge>
          </div>
          <Text className="text-gray-600 mb-4">
            Stories in the review pipeline
          </Text>
          
          {submittedStories.length > 0 ? (
            <div className="space-y-3">
              {submittedStories.slice(0, 5).map((story: Story) => (
                <div key={story.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{story.title}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4" />
                      <span>Submitted {formatDate(story.updatedAt)}</span>
                      {story.reviewer && (
                        <span>• Reviewer: {story.reviewer.firstName} {story.reviewer.lastName}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    color="white"
                    onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              ))}
              {submittedStories.length > 5 && (
                <Button
                  color="white"
                  className="w-full"
                  onClick={() => router.push('/newsroom/stories?status=IN_REVIEW')}
                >
                  View all {submittedStories.length} submitted stories
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <Text className="text-gray-500">No stories in review</Text>
            </div>
          )}
        </Card>
        ) : (
          /* Submitted for Approval - Journalists Only */
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3}>Submitted for Approval</Heading>
              <Badge color="green">{approvedStories.length}</Badge>
            </div>
            <Text className="text-gray-600 mb-4">
              Stories submitted to sub-editors for approval
            </Text>
            
            {approvedStories.length > 0 ? (
              <div className="space-y-3">
                {approvedStories.slice(0, 5).map((story: Story) => (
                  <div key={story.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{story.title}</h4>
                                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>Submitted for approval {formatDate(story.updatedAt)}</span>
                    </div>
                    </div>
                    <Button
                      color="white"
                      onClick={() => router.push(`/newsroom/stories/${story.id}`)}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                ))}
                {approvedStories.length > 5 && (
                  <Button
                    color="white"
                    className="w-full"
                    onClick={() => router.push('/newsroom/stories?status=PENDING_APPROVAL&authorId=' + userId)}
                  >
                    View all {approvedStories.length} submitted stories
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <Text className="text-gray-500">No stories submitted for approval</Text>
              </div>
            )}
          </Card>
        )}
      </div>
      )}

      {/* Assigned Translations Section - All Users */}
      {assignedTranslations.length > 0 && (
        <div className="mt-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3}>Assigned Translations</Heading>
              <Badge color="purple">{assignedTranslations.length}</Badge>
            </div>
            <Text className="text-gray-600 mb-4">
              Stories assigned to you for translation
            </Text>
            <div className="space-y-3">
              {assignedTranslations.slice(0, 5).map((translation: any) => (
                <div key={translation.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {translation.originalStory?.title || 'Untitled'} ({translation.targetLanguage})
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4" />
                      <span>Assigned {formatDate(translation.createdAt)}</span>
                      <Badge color="zinc" className="ml-2">{translation.status.replace('_', ' ')}</Badge>
                      {translation.originalStory?.author && (
                        <span>• Original by: {translation.originalStory.author.firstName} {translation.originalStory.author.lastName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {translation.status === 'IN_PROGRESS' && translation.translatedStoryId && (
                      <Button
                        color="secondary"
                        onClick={() => router.push(`/newsroom/translations/${translation.id}/review`)}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    )}
                    <Button
                      color="white"
                      onClick={() => router.push(`/newsroom/translations/${translation.id}/work`)}
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      {translation.status === 'PENDING' ? 'Start' : 
                       translation.status === 'REJECTED' ? 'Revise' : 'Continue'}
                    </Button>
                  </div>
                </div>
              ))}
              {assignedTranslations.length > 5 && (
                <Button
                  color="white"
                  className="w-full"
                  onClick={() => router.push('/newsroom/translations?assignedToId=' + userId)}
                >
                  View all {assignedTranslations.length} assigned translations
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}


    </Container>
  );
} 