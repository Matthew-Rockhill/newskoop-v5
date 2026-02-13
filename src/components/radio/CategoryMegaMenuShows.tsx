// Shows Hierarchical Menu Component
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import {
  PlayCircleIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';

interface ShowItem {
  id: string;
  title: string;
  description?: string;
  subShows?: Array<{
    id: string;
    title: string;
    description?: string;
    _count: { episodes: number };
  }>;
  _count: {
    episodes: number;
    subShows?: number;
  };
}

export function ShowsHierarchicalMenu({ onClose }: { onClose: () => void }) {
  const [selectedShow, setSelectedShow] = useState<ShowItem | null>(null);

  // Fetch published shows for radio
  const { data: showsData, isLoading } = useQuery({
    queryKey: ['radio-shows-menu'],
    queryFn: async () => {
      const response = await fetch('/api/radio/shows?perPage=20');
      if (!response.ok) throw new Error('Failed to fetch shows');
      return response.json();
    },
  });

  const shows: ShowItem[] = showsData?.shows || [];

  // Auto-select first show
  if (!selectedShow && shows.length > 0) {
    setSelectedShow(shows[0]);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Shows List */}
      <div>
        <Heading level={4} className="text-lg font-semibold text-zinc-900 mb-4">
          Shows & Podcasts
        </Heading>
        <div className="space-y-2">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-200 rounded-lg animate-pulse"></div>
            ))
          ) : shows.length > 0 ? (
            shows.map((show) => {
              const isSelected = selectedShow?.id === show.id;

              return (
                <div
                  key={show.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-kelly-green bg-kelly-green/5 text-kelly-green'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700'
                  }`}
                  onMouseEnter={() => setSelectedShow(show)}
                >
                  <div className="flex items-center gap-3">
                    <PlayCircleIcon className="h-5 w-5" />
                    <div className="flex-1 min-w-0">
                      <Text className="font-medium">{show.title}</Text>
                      <Text className="text-xs text-zinc-500 truncate">
                        {show.description || 'No description'}
                      </Text>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Badge color="zinc" className="text-xs">
                        {show._count.episodes} ep
                      </Badge>
                      {(show._count.subShows ?? 0) > 0 && (
                        <Badge color="blue" className="text-xs">
                          {show._count.subShows} sub
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <PlayCircleIcon className="h-12 w-12 text-zinc-300 mx-auto mb-2" />
              <Text className="text-zinc-500">No shows available</Text>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Show Details / Sub-Shows */}
      <div>
        {selectedShow ? (
          <>
            <Heading level={4} className="text-lg font-semibold text-zinc-900 mb-4">
              {selectedShow.subShows && selectedShow.subShows.length > 0
                ? `${selectedShow.title} - Sub-Shows`
                : selectedShow.title}
            </Heading>

            {selectedShow.subShows && selectedShow.subShows.length > 0 ? (
              // Show sub-shows grid
              <div className="space-y-2">
                {/* Link to parent show */}
                <Link
                  href={`/radio/shows/${selectedShow.id}`}
                  onClick={onClose}
                  className="block p-3 border border-kelly-green/30 rounded-lg bg-kelly-green/5 hover:bg-kelly-green/10 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <PlayCircleIcon className="h-4 w-4 text-kelly-green" />
                    <Text className="font-medium text-kelly-green text-sm">
                      View all {selectedShow.title}
                    </Text>
                  </div>
                </Link>
                {selectedShow.subShows.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/radio/shows/${sub.id}`}
                    onClick={onClose}
                    className="block p-3 border border-zinc-200 rounded-lg hover:border-kelly-green hover:bg-kelly-green/5 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Heading level={6} className="text-sm font-semibold text-zinc-900 group-hover:text-kelly-green">
                          {sub.title}
                        </Heading>
                        {sub.description && (
                          <Text className="text-xs text-zinc-500 mt-0.5">{sub.description}</Text>
                        )}
                      </div>
                      <Badge color="zinc" className="text-xs flex-shrink-0">
                        {sub._count.episodes} ep
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              // Show details and link for shows without sub-shows
              <div className="space-y-3">
                <Link
                  href={`/radio/shows/${selectedShow.id}`}
                  onClick={onClose}
                  className="block p-4 border border-zinc-200 rounded-lg hover:border-kelly-green hover:bg-kelly-green/5 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <PlayCircleIcon className="h-6 w-6 text-kelly-green" />
                    <Heading level={5} className="text-base font-semibold text-zinc-900 group-hover:text-kelly-green">
                      {selectedShow.title}
                    </Heading>
                  </div>
                  <Text className="text-sm text-zinc-600 mb-3">
                    {selectedShow.description || 'No description available'}
                  </Text>
                  <div className="flex items-center gap-2">
                    <MusicalNoteIcon className="h-4 w-4 text-zinc-400" />
                    <Text className="text-xs text-zinc-500">
                      {selectedShow._count.episodes} {selectedShow._count.episodes === 1 ? 'episode' : 'episodes'}
                    </Text>
                  </div>
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <Text className="text-zinc-500">Hover over a show to see details</Text>
          </div>
        )}

        {/* View All Shows Link */}
        <div className="mt-4 pt-4 border-t border-zinc-200">
          <Link
            href="/radio/shows"
            onClick={onClose}
            className="flex items-center gap-2 text-kelly-green hover:text-kelly-green-dark font-medium transition-colors text-sm"
          >
            <PlayCircleIcon className="h-4 w-4" />
            Browse All Shows & Podcasts
          </Link>
        </div>
      </div>
    </div>
  );
}
