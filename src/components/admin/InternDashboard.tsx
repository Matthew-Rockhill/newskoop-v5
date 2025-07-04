import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Container } from '@/components/ui/container';
import { StatsCard } from '@/components/ui/stats-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useStories } from '@/hooks/use-stories';
import { 
  PlusIcon,
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  EyeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

export function UserDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;
  const userRole = session?.user?.staffRole;
  const isJournalist = userRole === 'JOURNALIST';

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
  const { data: approvedStoriesData } = useStories({ 
    authorId: userId, 
    status: 'PENDING_APPROVAL', 
    page: 1, 
    perPage: 100 
  });

  const allStories = allStoriesData?.stories || [];
  const draftStories = draftStoriesData?.stories || [];
  const submittedStories = submittedStoriesData?.stories || [];
  const rejectedStories = rejectedStoriesData?.stories || [];
  const publishedStories = publishedStoriesData?.stories || [];
  const reviewStories = reviewStoriesData?.stories || [];
  const approvedStories = approvedStoriesData?.stories || [];

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

  const successMetrics = isJournalist ? [
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'gray';
      case 'IN_REVIEW': return 'yellow';
      case 'NEEDS_REVISION': return 'red';
      case 'PENDING_APPROVAL': return 'blue';
      case 'APPROVED': return 'green';
      case 'PUBLISHED': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Draft';
      case 'IN_REVIEW': return 'In Review';
      case 'NEEDS_REVISION': return 'Needs Revision';
      case 'PENDING_APPROVAL': return 'Pending Approval';
      case 'APPROVED': return 'Approved';
      case 'PUBLISHED': return 'Published';
      default: return status;
    }
  };

  return (
    <Container>
      {/* Custom Header with Quick Actions */}
      <div className="border-b border-zinc-200 pb-5 sm:flex sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
            My Dashboard
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back, {session?.user?.firstName || (isJournalist ? 'Journalist' : 'Intern')}! Here's your {isJournalist ? 'writing and review' : 'writing'} progress.
          </p>
        </div>
        <div className="mt-3 sm:ml-4 sm:mt-0">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => router.push('/admin/newsroom/stories/new')}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Create New Story</span>
            </Button>
            <Button
              color="white"
              onClick={() => router.push('/admin/newsroom/stories?authorId=' + userId)}
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              View {isJournalist ? 'My' : 'All My'} Stories
            </Button>
            {!isJournalist && rejectedCount > 0 && (
              <Button
                color="white"
                onClick={() => router.push('/admin/newsroom/stories?status=NEEDS_REVISION&authorId=' + userId)}
              >
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Fix Rejected Stories ({rejectedCount})
              </Button>
            )}
            {isJournalist && reviewCount > 0 && (
              <Button
                color="white"
                onClick={() => router.push('/admin/newsroom/stories?reviewerId=' + userId + '&status=IN_REVIEW')}
              >
                <UserGroupIcon className="h-4 w-4 mr-2" />
                Review Stories ({reviewCount})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Success Metrics */}
      <div className="mt-8">
        <StatsCard stats={successMetrics} />
      </div>

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
                {reviewStories.slice(0, 5).map((story) => (
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
                        onClick={() => router.push(`/admin/newsroom/stories/${story.id}`)}
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
                    onClick={() => router.push('/admin/newsroom/stories?reviewerId=' + userId + '&status=IN_REVIEW')}
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
      {!isJournalist && (
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
              {rejectedStories.slice(0, 5).map((story) => (
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
                      onClick={() => router.push(`/admin/newsroom/stories/${story.id}`)}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      onClick={() => router.push(`/admin/newsroom/stories/${story.id}/edit`)}
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
                  onClick={() => router.push('/admin/newsroom/stories?status=NEEDS_REVISION&authorId=' + userId)}
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

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Drafts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3}>My Drafts</Heading>
            <Badge color="zinc">{draftStories.length}</Badge>
          </div>
          <Text className="text-gray-600 mb-4">
            Stories you're currently working on
          </Text>
          
          {draftStories.length > 0 ? (
            <div className="space-y-3">
              {draftStories.slice(0, 5).map((story) => (
                <div key={story.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{story.title}</h4>
                    <p className="text-sm text-gray-600">
                      Last edited {formatDate(story.updatedAt)}
                    </p>
                  </div>
                  <Button
                    color="white"
                    onClick={() => router.push(`/admin/newsroom/stories/${story.id}/edit`)}
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
                  onClick={() => router.push('/admin/newsroom/stories?status=DRAFT')}
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
                  onClick={() => router.push('/admin/newsroom/stories/new')}
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
                {submittedStories.slice(0, 5).map((story) => (
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
                      onClick={() => router.push(`/admin/newsroom/stories/${story.id}`)}
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
                    onClick={() => router.push('/admin/newsroom/stories?status=IN_REVIEW')}
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
                {approvedStories.slice(0, 5).map((story) => (
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
                      onClick={() => router.push(`/admin/newsroom/stories/${story.id}`)}
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
                    onClick={() => router.push('/admin/newsroom/stories?status=PENDING_APPROVAL&authorId=' + userId)}
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


    </Container>
  );
} 