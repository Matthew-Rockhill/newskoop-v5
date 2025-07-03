'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  PencilSquareIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Divider } from '@/components/ui/divider';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';

import { useStory, useUpdateStoryStatus, useDeleteStory } from '@/hooks/use-stories';
import { StoryStatus } from '@prisma/client';

// Status badge colors
const statusColors = {
  DRAFT: 'zinc',
  IN_REVIEW: 'amber',
  NEEDS_REVISION: 'red',
  APPROVED: 'lime',
  PUBLISHED: 'emerald',
  ARCHIVED: 'gray',
} as const;

// Priority badge colors
const priorityColors = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'amber',
  URGENT: 'red',
  BREAKING: 'red',
} as const;

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch single story
  const { data: story, isLoading, error } = useStory(storyId);
  
  // Mutations
  const updateStoryStatusMutation = useUpdateStoryStatus();
  const deleteStoryMutation = useDeleteStory();

  const handleStatusUpdate = async (newStatus: StoryStatus) => {
    setIsUpdatingStatus(true);
    try {
      await updateStoryStatusMutation.mutateAsync({ 
        id: storyId, 
        data: { status: newStatus } 
      });
      toast.success('Story status updated successfully');
    } catch (error) {
      toast.error('Failed to update story status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteStoryMutation.mutateAsync(storyId);
      toast.success('Story deleted successfully');
      router.push('/admin/newsroom/stories');
    } catch (error) {
      toast.error('Failed to delete story');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusActions = (currentStatus: StoryStatus) => {
    const actions = [];
    
    switch (currentStatus) {
      case 'DRAFT':
        actions.push({
          label: 'Submit for Review',
          status: 'IN_REVIEW' as StoryStatus,
          color: 'amber',
          icon: EyeIcon,
        });
        break;
      case 'IN_REVIEW':
        actions.push(
          {
            label: 'Approve',
            status: 'APPROVED' as StoryStatus,
            color: 'emerald',
            icon: CheckCircleIcon,
          },
          {
            label: 'Request Revision',
            status: 'NEEDS_REVISION' as StoryStatus,
            color: 'red',
            icon: XCircleIcon,
          }
        );
        break;
      case 'NEEDS_REVISION':
        actions.push({
          label: 'Resubmit for Review',
          status: 'IN_REVIEW' as StoryStatus,
          color: 'amber',
          icon: EyeIcon,
        });
        break;
      case 'APPROVED':
        actions.push({
          label: 'Publish',
          status: 'PUBLISHED' as StoryStatus,
          color: 'emerald',
          icon: CheckCircleIcon,
        });
        break;
    }

    return actions;
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading story...</p>
        </div>
      </Container>
    );
  }

  if (error || !story) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading story: {error?.message || 'Story not found'}</p>
          <Button asChild className="mt-4">
            <Link href="/admin/newsroom/stories">Back to Stories</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const statusActions = getStatusActions(story.status);

  return (
    <Container>
      <PageHeader
        title={story.title}
        description={`Story #${story.id.slice(-8)}`}
        actions={
          <div className="flex items-center space-x-3">
            {/* Status Actions */}
            {statusActions.map((action) => (
              <Button
                key={action.status}
                color={action.color as any}
                size="sm"
                onClick={() => handleStatusUpdate(action.status)}
                disabled={isUpdatingStatus}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
            
            {/* Edit Button */}
            <Button asChild size="sm" color="white">
              <Link href={`/admin/newsroom/stories/${story.id}/edit`}>
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </Link>
            </Button>

            {/* Delete Button */}
            <Button
              size="sm"
              color="red"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <TrashIcon className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Story Content */}
          <Card className="p-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                {story.content}
              </div>
            </div>
          </Card>

          {/* Comments Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3}>Comments</Heading>
              <Badge color="gray" size="sm">
                {story._count?.comments || 0} comments
              </Badge>
            </div>
            
            {/* Comments would be loaded here */}
            <div className="text-center py-8 text-gray-500">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Comments functionality coming soon</p>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Priority */}
          <Card className="p-6">
            <Heading level={3} className="mb-4">Status & Priority</Heading>
            
            <DescriptionList>
              <DescriptionTerm>Status</DescriptionTerm>
              <DescriptionDetails>
                <Badge color={statusColors[story.status]} size="sm">
                  {story.status.replace('_', ' ')}
                </Badge>
              </DescriptionDetails>

              <DescriptionTerm>Priority</DescriptionTerm>
              <DescriptionDetails>
                <Badge color={priorityColors[story.priority]} size="sm">
                  {story.priority}
                </Badge>
              </DescriptionDetails>


            </DescriptionList>
          </Card>

          {/* Author & Dates */}
          <Card className="p-6">
            <Heading level={3} className="mb-4">Author & Timeline</Heading>
            
            <DescriptionList>
              <DescriptionTerm>Author</DescriptionTerm>
              <DescriptionDetails>
                <div className="flex items-center space-x-2">
                  <Avatar
                    className="h-6 w-6"
                    name={`${story.author.firstName} ${story.author.lastName}`}
                  />
                  <span>{story.author.firstName} {story.author.lastName}</span>
                </div>
              </DescriptionDetails>

              <DescriptionTerm>Created</DescriptionTerm>
              <DescriptionDetails>
                {formatDate(story.createdAt)}
              </DescriptionDetails>

              <DescriptionTerm>Last Updated</DescriptionTerm>
              <DescriptionDetails>
                {formatDate(story.updatedAt)}
              </DescriptionDetails>

              {story.publishedAt && (
                <>
                  <DescriptionTerm>Published</DescriptionTerm>
                  <DescriptionDetails>
                    {formatDate(story.publishedAt)}
                  </DescriptionDetails>
                </>
              )}
            </DescriptionList>
          </Card>

          {/* Category & Tags */}
          <Card className="p-6">
            <Heading level={3} className="mb-4">Organization</Heading>
            
            <DescriptionList>
              <DescriptionTerm>Category</DescriptionTerm>
              <DescriptionDetails>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: story.category.color || '#6B7280' }}
                  />
                  <span>{story.category.name}</span>
                </div>
              </DescriptionDetails>

              {story.tags && story.tags.length > 0 && (
                <>
                  <DescriptionTerm>Tags</DescriptionTerm>
                  <DescriptionDetails>
                    <div className="flex flex-wrap gap-1">
                      {story.tags.map((storyTag: any) => (
                        <Badge 
                          key={storyTag.tag.id} 
                          color="gray" 
                          size="sm"
                        >
                          {storyTag.tag.name}
                        </Badge>
                      ))}
                    </div>
                  </DescriptionDetails>
                </>
              )}
            </DescriptionList>
          </Card>
        </div>
      </div>
    </Container>
  );
}