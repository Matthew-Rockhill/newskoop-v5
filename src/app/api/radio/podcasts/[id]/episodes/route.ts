import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenPodcastEpisodeAudio(episode: any) {
  if (!episode) return episode;
  return {
    ...episode,
    audioClips: episode.audioClips?.map((eac: any) => eac.audioClip) || [],
  };
}

// GET /api/radio/podcasts/[id]/episodes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const podcast = await prisma.podcast.findUnique({
      where: { id, isActive: true, isPublished: true },
    });

    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;

    const [episodes, total] = await Promise.all([
      prisma.podcastEpisode.findMany({
        where: { podcastId: id, status: 'PUBLISHED' },
        include: {
          audioClips: { include: { audioClip: true } },
          publisher: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { episodeNumber: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.podcastEpisode.count({
        where: { podcastId: id, status: 'PUBLISHED' },
      }),
    ]);

    return NextResponse.json({
      episodes: episodes.map(flattenPodcastEpisodeAudio),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
  }
}
