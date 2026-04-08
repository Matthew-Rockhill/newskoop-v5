import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClassificationType } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenPodcastEpisodeAudio(episode: any) {
  if (!episode) return episode;
  return {
    ...episode,
    audioClips: episode.audioClips?.map((eac: any) => eac.audioClip) || [],
  };
}

// GET /api/radio/podcasts/[id]
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

    const podcastRaw = await prisma.podcast.findUnique({
      where: {
        id,
        isActive: true,
        isPublished: true,
      },
      include: {
        category: true,
        classifications: {
          include: { classification: true },
        },
        episodes: {
          where: { status: 'PUBLISHED' },
          include: {
            audioClips: { include: { audioClip: true } },
          },
          orderBy: { episodeNumber: 'desc' },
        },
      },
    });

    if (!podcastRaw) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    // For RADIO users, check station permissions
    if (session.user.userType === 'RADIO') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { radioStation: true },
      });

      if (!user?.radioStation) {
        return NextResponse.json({ error: 'No station associated with user' }, { status: 400 });
      }

      const station = user.radioStation;

      if (podcastRaw.categoryId && station.blockedCategories.includes(podcastRaw.categoryId)) {
        return NextResponse.json({ error: 'This podcast is not available for your station' }, { status: 403 });
      }

      const languageClassifications = podcastRaw.classifications
        .filter(pc => pc.classification.type === ClassificationType.LANGUAGE)
        .map(pc => pc.classification.name);

      const hasAllowedLanguage = languageClassifications.some(lang =>
        station.allowedLanguages.includes(lang)
      );

      if (languageClassifications.length > 0 && !hasAllowedLanguage) {
        return NextResponse.json({ error: 'This podcast is not available in your allowed languages' }, { status: 403 });
      }
    }

    const podcast = {
      ...podcastRaw,
      classifications: podcastRaw.classifications.map(pc => pc.classification),
      episodes: podcastRaw.episodes.map(flattenPodcastEpisodeAudio),
    };

    return NextResponse.json({ podcast });
  } catch (error) {
    console.error('Error fetching podcast:', error);
    return NextResponse.json({ error: 'Failed to fetch podcast' }, { status: 500 });
  }
}
