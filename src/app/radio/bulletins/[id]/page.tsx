'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
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
  PrinterIcon,
  ArrowDownTrayIcon,
  SpeakerWaveIcon,
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

  const handlePrint = () => {
    if (!bulletin) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const storiesHtml = bulletin.bulletinStories
      .map((bs, idx) => `
        <div class="story">
          <h3>${idx + 1}. ${bs.story.title}</h3>
          ${bs.story.content ? `<div>${bs.story.content}</div>` : ''}
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

    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

    const storiesText = bulletin.bulletinStories
      .map((bs, idx) => `${idx + 1}. ${bs.story.title}\n${stripHtml(bs.story.content || '')}`)
      .join('\n\n');

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

        {/* Bulletin Content */}
        <Card className="p-6 bg-white shadow-lg">
          <Heading level={2} className="text-lg font-semibold text-zinc-900 mb-4">
            Bulletin Content
          </Heading>

          <div className="space-y-4">
            {/* Introduction */}
            <div className="border border-zinc-200 rounded-lg p-4 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Badge color="zinc">Intro</Badge>
              </div>
              <div className="prose prose-sm max-w-none text-zinc-700">
                {bulletin.intro ? (
                  <div dangerouslySetInnerHTML={{ __html: bulletin.intro }} />
                ) : (
                  <p className="text-zinc-500 italic">No introduction provided</p>
                )}
              </div>
            </div>

            {/* Stories */}
            {bulletin.bulletinStories.length > 0 ? (
              bulletin.bulletinStories.map((bs, idx) => (
                <div key={bs.id} className="border border-zinc-200 rounded-lg p-4 bg-white">
                  {/* Story Badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge color="zinc">Story {idx + 1}</Badge>
                    {bs.story.category && (
                      <Badge color="green">{bs.story.category.name}</Badge>
                    )}
                    {bs.story.audioClips && bs.story.audioClips.length > 0 && (
                      <Badge color="purple" className="flex items-center gap-1">
                        <SpeakerWaveIcon className="h-3 w-3" />
                        Audio
                      </Badge>
                    )}
                  </div>

                  {/* Story Content */}
                  <div className="prose prose-sm max-w-none text-zinc-700">
                    {bs.story.content ? (
                      <div dangerouslySetInnerHTML={{ __html: bs.story.content }} />
                    ) : (
                      <p className="text-zinc-500 italic">No content available</p>
                    )}
                  </div>

                  {/* Audio Clips */}
                  {bs.story.audioClips && bs.story.audioClips.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {bs.story.audioClips.map((clip) => (
                        <CustomAudioPlayer
                          key={clip.id}
                          clip={clip}
                          compact
                          onError={() => toast.error('Failed to play audio file')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-zinc-50 rounded-lg border border-zinc-200">
                <Text className="text-zinc-500">No stories in this bulletin</Text>
              </div>
            )}

            {/* Outro */}
            <div className="border border-zinc-200 rounded-lg p-4 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Badge color="zinc">Outro</Badge>
              </div>
              <div className="prose prose-sm max-w-none text-zinc-700">
                {bulletin.outro ? (
                  <div dangerouslySetInnerHTML={{ __html: bulletin.outro }} />
                ) : (
                  <p className="text-zinc-500 italic">No outro provided</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Container>
    </div>
  );
}
