'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { CustomAudioPlayer } from '@/components/ui/audio-player';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  MusicalNoteIcon,
  MegaphoneIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface BulletinStoryAudioClip {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  duration: number | null;
  mimeType: string;
}

interface BulletinStory {
  id: string;
  order: number;
  story: {
    id: string;
    title: string;
    excerpt?: string;
    content?: string;
    audioUrl?: string | null;
    audioClips: BulletinStoryAudioClip[];
    author?: {
      firstName: string;
      lastName: string;
    };
    category?: {
      name: string;
    };
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

export default function BulletinDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const bulletinId = params.id as string;
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['radio-bulletin', bulletinId],
    queryFn: async () => {
      const response = await fetch(`/api/radio/bulletins/${bulletinId}`);
      if (!response.ok) throw new Error('Failed to fetch bulletin');
      return response.json();
    },
    enabled: !!session && !!bulletinId,
  });

  const bulletin: Bulletin | null = data?.bulletin || null;

  // Track view
  useEffect(() => {
    if (bulletin?.id) {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'BULLETIN',
          contentId: bulletin.id,
          language: bulletin.languageDisplay,
        }),
      }).catch(() => {});
    }
  }, [bulletin?.id, bulletin?.languageDisplay]);

  // Audio handlers
  const handleAudioPlay = (audioId: string) => setPlayingAudioId(audioId);
  const handleAudioStop = () => setPlayingAudioId(null);
  const handleAudioRestart = (audioId: string) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: 0 }));
    setPlayingAudioId(audioId);
  };
  const handleAudioSeek = (audioId: string, time: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: time }));
  };
  const handleAudioTimeUpdate = (audioId: string, currentTime: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: currentTime }));
  };
  const handleAudioLoadedMetadata = (audioId: string, duration: number) => {
    setAudioDuration(prev => ({ ...prev, [audioId]: duration }));
  };

  const handlePrint = () => {
    if (!bulletin) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const storiesHtml = bulletin.bulletinStories
      .map((bs, idx) => `
        <div class="story">
          <h3>${idx + 1}. ${bs.story.title}</h3>
          ${bs.story.excerpt ? `<p>${bs.story.excerpt}</p>` : ''}
          ${bs.story.audioClips?.length > 0 ? '<p class="audio-note">Audio available in digital version</p>' : ''}
        </div>
      `)
      .join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${bulletin.title}</title>
          <style>
            body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #1f2937; padding: 20px; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
            .meta { font-size: 14px; color: #6b7280; margin-bottom: 10px; }
            .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
            .section h2 { font-size: 16px; color: #374151; margin-bottom: 10px; }
            .story { margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .story h3 { font-size: 16px; margin-bottom: 5px; }
            .audio-note { font-size: 12px; color: #0369a1; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${bulletin.title}</h1>
            <div class="meta">
              ${bulletin.publishedAt ? new Date(bulletin.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              ${bulletin.author ? ` · ${bulletin.author.firstName} ${bulletin.author.lastName}` : ''}
              · ${bulletin.languageDisplay}
              ${bulletin.schedule ? ` · ${bulletin.schedule.title}` : ''}
            </div>
          </div>
          <div class="section"><h2>Introduction</h2><div>${bulletin.intro}</div></div>
          <h2>Stories (${bulletin.bulletinStories.length})</h2>
          ${storiesHtml}
          <div class="section"><h2>Outro</h2><div>${bulletin.outro}</div></div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); printWindow.close(); };
  };

  const handleDownload = () => {
    if (!bulletin) return;

    const storiesText = bulletin.bulletinStories
      .map((bs, idx) => `${idx + 1}. ${bs.story.title}\n${bs.story.excerpt || ''}`)
      .join('\n\n');

    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

    const textContent = `
${bulletin.title}

Published: ${bulletin.publishedAt ? new Date(bulletin.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
Author: ${bulletin.author ? `${bulletin.author.firstName} ${bulletin.author.lastName}` : 'NewsKoop'}
Language: ${bulletin.languageDisplay}
${bulletin.schedule ? `Schedule: ${bulletin.schedule.title}` : ''}

--- INTRODUCTION ---
${stripHtml(bulletin.intro)}

--- STORIES ---
${storiesText}

--- OUTRO ---
${stripHtml(bulletin.outro)}

---
Downloaded from NewsKoop Radio Station Zone
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bulletin.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
        <Container className="pt-24 pb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-zinc-200 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-zinc-200 rounded w-3/4 mb-8"></div>
            <div className="h-64 bg-zinc-200 rounded mb-4"></div>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !bulletin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
        <Container className="pt-24 pb-8">
          <div className="text-center py-12">
            <Heading level={2} className="text-red-600 mb-4">Bulletin Not Found</Heading>
            <Text className="text-zinc-600 mb-6">
              The bulletin you&apos;re looking for doesn&apos;t exist or isn&apos;t available.
            </Text>
            <Button onClick={() => router.push('/radio/bulletins')}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Bulletins
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  const publishedDate = bulletin.publishedAt
    ? new Date(bulletin.publishedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Container className="pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <PageHeader
            title={bulletin.title}
            description={
              <div className="flex items-center flex-wrap gap-4 text-sm">
                {publishedDate && (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{publishedDate}</span>
                  </div>
                )}
                {bulletin.author && (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <UserIcon className="h-4 w-4" />
                    <span>{bulletin.author.firstName} {bulletin.author.lastName}</span>
                  </div>
                )}
                <Badge color="blue">{bulletin.languageDisplay}</Badge>
                {bulletin.schedule && (
                  <Badge color="zinc">{bulletin.schedule.title}</Badge>
                )}
                <Badge color="zinc">
                  {bulletin.bulletinStories.length} {bulletin.bulletinStories.length === 1 ? 'story' : 'stories'}
                </Badge>
              </div>
            }
            actions={
              <div className="flex items-center gap-3">
                <Button color="white" onClick={() => router.push('/radio/bulletins')}>
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button color="white" onClick={handleDownload}>
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button color="white" onClick={handlePrint}>
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            }
          />
        </div>

        {/* Introduction */}
        <Card className="p-6 bg-white shadow-lg mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MegaphoneIcon className="h-5 w-5 text-kelly-green" />
            <Heading level={3} className="text-lg font-semibold text-zinc-900">Introduction</Heading>
          </div>
          <div
            className="prose prose-lg max-w-none text-zinc-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: bulletin.intro }}
          />
        </Card>

        {/* Stories */}
        {bulletin.bulletinStories.length > 0 && (
          <div className="space-y-4 mb-6">
            <Heading level={3} className="text-lg font-semibold text-zinc-900 px-1">
              Stories ({bulletin.bulletinStories.length})
            </Heading>
            {bulletin.bulletinStories.map((bs, idx) => (
              <Card key={bs.id} className="p-6 bg-white shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-kelly-green text-white flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => router.push(`/radio/story/${bs.story.id}`)}
                      className="text-left w-full"
                    >
                      <Heading level={4} className="text-base font-semibold text-zinc-900 hover:text-kelly-green transition-colors">
                        {bs.story.title}
                      </Heading>
                    </button>
                    {bs.story.excerpt && (
                      <Text className="text-sm text-zinc-600 mt-1 line-clamp-2">
                        {bs.story.excerpt}
                      </Text>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                      {bs.story.author && (
                        <span>{bs.story.author.firstName} {bs.story.author.lastName}</span>
                      )}
                      {bs.story.category && (
                        <Badge color="zinc" className="text-xs">{bs.story.category.name}</Badge>
                      )}
                    </div>

                    {/* Audio clips for this story */}
                    {bs.story.audioClips && bs.story.audioClips.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {bs.story.audioClips.map((clip) => (
                          <div key={clip.id} className="bg-zinc-50 rounded-lg p-3">
                            <CustomAudioPlayer
                              clip={clip}
                              isPlaying={playingAudioId === clip.id}
                              currentTime={audioProgress[clip.id] || 0}
                              duration={audioDuration[clip.id] || 0}
                              onPlay={handleAudioPlay}
                              onStop={handleAudioStop}
                              onRestart={handleAudioRestart}
                              onSeek={handleAudioSeek}
                              onTimeUpdate={handleAudioTimeUpdate}
                              onLoadedMetadata={handleAudioLoadedMetadata}
                              onEnded={() => setPlayingAudioId(null)}
                              onError={() => setPlayingAudioId(null)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Outro */}
        <Card className="p-6 bg-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <MegaphoneIcon className="h-5 w-5 text-kelly-green" />
            <Heading level={3} className="text-lg font-semibold text-zinc-900">Outro</Heading>
          </div>
          <div
            className="prose prose-lg max-w-none text-zinc-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: bulletin.outro }}
          />
        </Card>
      </Container>
    </div>
  );
}
