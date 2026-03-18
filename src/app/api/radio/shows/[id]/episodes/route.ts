import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Flatten episode audioClips from join-table format to flat AudioClip objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenEpisodeAudio(episode: any) {
  if (!episode) return episode;
  return {
    ...episode,
    audioClips: episode.audioClips?.map((eac: any) => eac.audioClip) || [],
  };
}

// GET /api/radio/shows/[id]/episodes - Get published episodes for a show
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify show exists and is published
    const show = await prisma.show.findUnique({
      where: {
        id,
        isActive: true,
        isPublished: true,
      },
    });

    if (!show) {
      return NextResponse.json(
        { error: 'Show not found' },
        { status: 404 }
      );
    }

    // Get pagination params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;

    // Get published episodes
    const [episodes, total] = await Promise.all([
      prisma.episode.findMany({
        where: {
          showId: id,
          status: 'PUBLISHED',
        },
        include: {
          audioClips: { include: { audioClip: true } },
          publisher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          episodeNumber: 'desc',
        },
        skip,
        take: perPage,
      }),
      prisma.episode.count({
        where: {
          showId: id,
          status: 'PUBLISHED',
        },
      }),
    ]);

    return NextResponse.json({
      episodes: episodes.map(flattenEpisodeAudio),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
}
