'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import {
  TrashIcon,
  Bars3Icon,
  UserIcon,
  ClockIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { formatDateShort } from '@/lib/format';

interface Story {
  id: string;
  title: string;
  content: string | null;
  author: {
    firstName: string;
    lastName: string;
  };
  category: {
    name: string;
    slug: string;
  };
  tags: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
  publishedAt: string;
  order: number;
}

interface StoryListProps {
  stories: Story[];
  onRemove: (storyId: string) => void;
  onReorder: (reorderedStories: Story[]) => void;
}

interface SortableStoryProps {
  story: Story;
  index: number;
  onRemove: (storyId: string) => void;
}

function SortableStory({ story, index, onRemove }: SortableStoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const truncateContent = (content: string | null, maxLength: number = 100) => {
    if (!content) return 'No content available';
    // Strip HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...' 
      : textContent;
  };

  const getLanguageTag = (storyTags: Story['tags']) => {
    return storyTags.find(tag => tag.category === 'LANGUAGE');
  };

  const languageTag = getLanguageTag(story.tags);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-4 bg-white border border-zinc-200 rounded-lg ${
        isDragging ? 'shadow-lg z-10' : ''
      }`}
    >
      {/* Order Badge */}
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-kelly-green text-white rounded-full text-sm font-semibold">
        {index + 1}
      </div>

      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-1 text-zinc-400 hover:text-zinc-600 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder story"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Story Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-medium text-zinc-900 truncate">
            {story.title}
          </h4>
          {languageTag && (
            <Badge color="blue">
              {languageTag.name}
            </Badge>
          )}
          <Badge color="green">
            {story.category.name}
          </Badge>
        </div>

        <p className="text-sm text-zinc-600 mb-2 line-clamp-2">
          {truncateContent(story.content)}
        </p>

        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            {story.author.firstName} {story.author.lastName}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {formatDateShort(story.publishedAt)}
          </span>
          {story.tags.filter(t => t.category !== 'LANGUAGE').length > 0 && (
            <span className="flex items-center gap-1">
              <TagIcon className="h-3 w-3" />
              {story.tags.filter(t => t.category !== 'LANGUAGE').length} tags
            </span>
          )}
        </div>
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        outline
        onClick={() => onRemove(story.id)}
        className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function StoryList({ stories, onRemove, onReorder }: StoryListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stories.findIndex((story) => story.id === active.id);
      const newIndex = stories.findIndex((story) => story.id === over.id);

      const reorderedStories = arrayMove(stories, oldIndex, newIndex);
      onReorder(reorderedStories);
    }
  };

  if (stories.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-zinc-400 mb-2">
          <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <Text className="text-zinc-600 mb-2">No stories selected</Text>
        <Text className="text-sm text-zinc-500">
          Add stories from the selector to build your bulletin
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <Text className="text-sm text-blue-800">
          <strong>Tip:</strong> Drag the handle (⋮⋮⋮) to reorder stories. The number indicates the reading order.
        </Text>
      </div>

      {/* Story List */}
      <div className="max-h-96 overflow-y-auto space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={stories} strategy={verticalListSortingStrategy}>
            {stories.map((story, index) => (
              <SortableStory
                key={story.id}
                story={story}
                index={index}
                onRemove={onRemove}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Summary */}
      <div className="pt-3 border-t border-zinc-200">
        <Text className="text-sm text-zinc-600">
          <strong>{stories.length}</strong> {stories.length === 1 ? 'story' : 'stories'} selected
        </Text>
      </div>
    </div>
  );
}