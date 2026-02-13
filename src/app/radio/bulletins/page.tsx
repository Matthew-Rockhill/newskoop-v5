'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { DataList, type DataListColumn } from '@/components/ui/data-list';
import { PageHeader } from '@/components/ui/page-header';
import { MegaphoneIcon } from '@heroicons/react/24/outline';

interface BulletinStory {
  id: string;
  order: number;
  story: {
    id: string;
    title: string;
    excerpt?: string;
    audioClips?: Array<{ id: string; url: string; duration?: number }>;
  };
}

interface Bulletin {
  id: string;
  title: string;
  intro: string;
  outro: string;
  language: string;
  languageDisplay: string;
  status: string;
  publishedAt: string | null;
  scheduledFor: string | null;
  storyCount: number;
  author?: {
    firstName: string;
    lastName: string;
  };
  category?: {
    name: string;
  };
  schedule?: {
    title: string;
    time: string;
  };
  bulletinStories: BulletinStory[];
}

export default function BulletinsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch user profile to get default language preference
  const { data: profileData } = useQuery({
    queryKey: ['radio-profile'],
    queryFn: async () => {
      const response = await fetch('/api/radio/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!session,
  });

  const defaultLanguage = profileData?.user?.defaultLanguagePreference || 'English';
  const [selectedLanguage, setSelectedLanguage] = useState<string>(defaultLanguage);

  useEffect(() => {
    if (profileData?.user?.defaultLanguagePreference) {
      setSelectedLanguage(profileData.user.defaultLanguagePreference);
    }
  }, [profileData?.user?.defaultLanguagePreference]);

  // Fetch bulletins from the correct API
  const { data, isLoading, error } = useQuery({
    queryKey: ['radio-bulletins', currentPage, selectedLanguage],
    queryFn: async () => {
      const response = await fetch(
        `/api/radio/bulletins?language=${selectedLanguage}&page=${currentPage}&perPage=20`
      );
      if (!response.ok) throw new Error('Failed to fetch bulletins');
      return response.json();
    },
    enabled: !!session,
  });

  const bulletins: Bulletin[] = data?.bulletins || [];
  const pagination = data?.pagination;
  const station = data?.station;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const columns: DataListColumn<Bulletin>[] = useMemo(() => [
    {
      key: 'bulletin',
      header: 'Bulletin',
      priority: 1,
      width: 'expand',
      render: (bulletin) => (
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xl font-semibold text-zinc-900 group-hover:text-kelly-green transition-colors mb-2">
              {bulletin.title}
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-500 mb-3">
              {bulletin.publishedAt && (
                <span>{formatDate(bulletin.publishedAt)}</span>
              )}
              {bulletin.author && (
                <>
                  <span>·</span>
                  <span>{bulletin.author.firstName} {bulletin.author.lastName}</span>
                </>
              )}
              {bulletin.schedule && (
                <>
                  <span>·</span>
                  <span>{bulletin.schedule.title}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge color="blue" className="text-xs">
                {bulletin.languageDisplay}
              </Badge>
              {bulletin.storyCount > 0 && (
                <Badge color="zinc" className="text-xs">
                  {bulletin.storyCount} {bulletin.storyCount === 1 ? 'story' : 'stories'}
                </Badge>
              )}
              {bulletin.bulletinStories?.some(bs => bs.story.audioClips && bs.story.audioClips.length > 0) && (
                <Badge color="green" className="text-xs">
                  Audio available
                </Badge>
              )}
            </div>
          </div>
          <MegaphoneIcon className="h-8 w-8 text-kelly-green flex-shrink-0 ml-4" />
        </div>
      ),
      mobileRender: (bulletin) => (
        <div className="space-y-3">
          <div className="flex items-start gap-4">
            <MegaphoneIcon className="h-6 w-6 text-kelly-green flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-zinc-900">
                {bulletin.title}
              </div>
              <div className="text-sm text-zinc-500">
                {bulletin.publishedAt && formatDate(bulletin.publishedAt)}
                {bulletin.schedule && ` · ${bulletin.schedule.title}`}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge color="blue" className="text-xs">
              {bulletin.languageDisplay}
            </Badge>
            {bulletin.storyCount > 0 && (
              <Badge color="zinc" className="text-xs">
                {bulletin.storyCount} stories
              </Badge>
            )}
          </div>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Container className="pt-24 pb-8">
        <div className="mb-8">
          <PageHeader
            title="News Bulletins"
            description="Browse published news bulletins"
          />
        </div>

        {/* Language Filter */}
        {station?.allowedLanguages && station.allowedLanguages.length > 1 && (
          <div
            role="group"
            aria-label="Filter bulletins by language"
            className="mb-6 flex flex-wrap gap-2"
          >
            <Text className="text-sm text-zinc-600 self-center mr-2">Language:</Text>
            {station.allowedLanguages.map((lang: string) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                aria-pressed={selectedLanguage === lang}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-kelly-green text-white'
                    : 'bg-white text-zinc-600 border border-zinc-300 hover:border-kelly-green hover:text-kelly-green'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}

        <DataList<Bulletin>
          items={bulletins}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          variant="cards"
          columns={columns}
          onRowClick={(bulletin) => router.push(`/radio/bulletins/${bulletin.id}`)}
          getRowHref={(bulletin) => `/radio/bulletins/${bulletin.id}`}
          pagination={pagination ? {
            page: pagination.page,
            pageSize: 20,
            total: pagination.total,
            onPageChange: setCurrentPage,
          } : undefined}
          emptyState={{
            icon: MegaphoneIcon,
            title: "No bulletins available",
            description: selectedLanguage !== 'English'
              ? `No bulletins available in ${selectedLanguage}. Try selecting a different language.`
              : 'Check back later for new bulletins.',
          }}
          ariaLabel="News bulletins list"
        />
      </Container>
    </div>
  );
}
