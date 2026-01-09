// Speciality Hierarchical Menu Component
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { 
  MusicalNoteIcon,
  HeartIcon,
  CpuChipIcon,
  NewspaperIcon,
  SparklesIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

export function SpecialityHierarchicalMenu({ onClose }: { onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Lifestyle');

  // Fetch level 2 categories for Speciality
  const { data: level2Data, isLoading: categoriesLoading } = useQuery({
    queryKey: ['speciality-level2'],
    queryFn: async () => {
      const response = await fetch('/api/radio/speciality-categories');
      if (!response.ok) throw new Error('Failed to fetch speciality categories');
      return response.json();
    },
  });

  // Fetch recent stories for selected category
  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ['speciality-recent-stories', selectedCategory],
    queryFn: async () => {
      const response = await fetch(`/api/radio/recent-stories?category=${encodeURIComponent(selectedCategory)}&limit=4`);
      if (!response.ok) throw new Error('Failed to fetch recent stories');
      return response.json();
    },
  });

  const level2Categories = level2Data?.categories || [];
  const recentStories = storiesData?.stories || [];

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Lifestyle':
        return HeartIcon;
      case 'Agriskoops':
        return GlobeAltIcon;
      case 'Techskoops':
        return CpuChipIcon;
      case 'Paperskoops':
        return NewspaperIcon;
      case 'Goodskoops':
        return SparklesIcon;
      default:
        return NewspaperIcon;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Level 2 Categories */}
      <div>
        <Heading level={4} className="text-lg font-semibold text-zinc-900 mb-4">
          Speciality Content
        </Heading>
        <div className="space-y-2">
          {categoriesLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-200 rounded-lg animate-pulse"></div>
            ))
          ) : (
            level2Categories.map((cat: any) => {
              const Icon = getCategoryIcon(cat.name);
              const isSelected = selectedCategory === cat.name;
              
              return (
                <div
                  key={cat.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-kelly-green bg-kelly-green/5 text-kelly-green'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700'
                  }`}
                  onMouseEnter={() => setSelectedCategory(cat.name)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <div>
                      <Text className="font-medium">{cat.name}</Text>
                      <Text className="text-xs text-zinc-500">{cat.description}</Text>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Recent Stories */}
      <div>
        <Heading level={4} className="text-lg font-semibold text-zinc-900 mb-4">
          Recent {selectedCategory}
        </Heading>
        <div className="space-y-3">
          {storiesLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="p-3 border border-zinc-200 rounded-lg animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-zinc-200 rounded w-1/2"></div>
              </div>
            ))
          ) : recentStories.length > 0 ? (
            recentStories.map((story: any) => (
              <Link
                key={story.id}
                href={`/radio/story/${story.id}`}
                onClick={onClose}
                className="block p-3 border border-zinc-200 rounded-lg hover:border-kelly-green hover:bg-kelly-green/5 transition-all group"
              >
                <Heading level={6} className="text-sm font-semibold text-zinc-900 group-hover:text-kelly-green mb-1 line-clamp-2">
                  {story.title}
                </Heading>
                <Text className="text-xs text-zinc-600 line-clamp-2 mb-2">
                  {story.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                </Text>
                <div className="flex items-center justify-between">
                  <Text className="text-xs text-zinc-500">
                    {new Date(story.publishedAt).toLocaleDateString()}
                  </Text>
                  {story.audioClips?.length > 0 && (
                    <MusicalNoteIcon className="h-3 w-3 text-kelly-green" />
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-6">
              <SparklesIcon className="h-12 w-12 text-zinc-300 mx-auto mb-2" />
              <Text className="text-zinc-500">No recent stories available</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}