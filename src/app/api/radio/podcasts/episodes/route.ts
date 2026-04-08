import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma, ClassificationType } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenPodcastEpisodeAudio(episode: any) {
  if (!episode) return episode;
  return {
    ...episode,
    audioClips: episode.audioClips?.map((eac: any) => eac.audioClip) || [],
  };
}

// GET /api/radio/podcasts/episodes - Get paginated episodes across podcasts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { radioStation: true },
    });

    let station = null;
    let allowedLanguages = ['English', 'Afrikaans', 'Xhosa'];
    let blockedCategories: string[] = [];

    if (session.user.userType === 'RADIO') {
      if (!user?.radioStation) {
        return NextResponse.json({ error: 'No station associated with user' }, { status: 400 });
      }

      station = user.radioStation;

      if (!station.isActive || !station.hasContentAccess) {
        return NextResponse.json({ error: 'Station does not have content access' }, { status: 403 });
      }

      allowedLanguages = station.allowedLanguages;
      blockedCategories = station.blockedCategories;
    } else if (session.user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Invalid user type for radio access' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '12');
    const skip = (page - 1) * perPage;
    const podcastId = url.searchParams.get('podcastId');
    const language = url.searchParams.get('language');

    const where: Prisma.PodcastEpisodeWhereInput = {
      status: 'PUBLISHED',
      podcast: {
        isActive: true,
        isPublished: true,
      },
    };

    if (podcastId) {
      where.podcastId = podcastId;
    }

    if (session.user.userType === 'RADIO' && blockedCategories.length > 0) {
      where.podcast = {
        ...where.podcast as Prisma.PodcastWhereInput,
        categoryId: { notIn: blockedCategories },
      };
    }

    if (session.user.userType === 'RADIO') {
      const languageClassifications = await prisma.classification.findMany({
        where: {
          type: ClassificationType.LANGUAGE,
          name: { in: allowedLanguages },
        },
        select: { id: true },
      });

      const languageClassificationIds = languageClassifications.map(c => c.id);

      if (languageClassificationIds.length > 0) {
        where.podcast = {
          ...where.podcast as Prisma.PodcastWhereInput,
          classifications: {
            some: {
              classificationId: { in: languageClassificationIds },
            },
          },
        };
      }
    }

    if (language && language !== 'all') {
      const langClassification = await prisma.classification.findFirst({
        where: {
          type: ClassificationType.LANGUAGE,
          name: language,
        },
        select: { id: true },
      });

      if (langClassification) {
        where.podcast = {
          ...where.podcast as Prisma.PodcastWhereInput,
          classifications: {
            some: {
              classificationId: langClassification.id,
            },
          },
        };
      }
    }

    const [episodes, total] = await Promise.all([
      prisma.podcastEpisode.findMany({
        where,
        include: {
          podcast: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              classifications: {
                include: { classification: true },
              },
            },
          },
          audioClips: { include: { audioClip: true } },
          publisher: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.podcastEpisode.count({ where }),
    ]);

    const transformedEpisodes = episodes.map(ep => ({
      ...flattenPodcastEpisodeAudio(ep),
      podcast: {
        ...ep.podcast,
        classifications: ep.podcast.classifications.map(pc => pc.classification),
      },
    }));

    return NextResponse.json({
      episodes: transformedEpisodes,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
      station: {
        name: station?.name || 'Newskoop',
        allowedLanguages: station?.allowedLanguages || allowedLanguages,
      },
    });
  } catch (error) {
    console.error('Error fetching podcast episodes:', error);
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
  }
}
