import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma, ClassificationType } from '@prisma/client';

// GET /api/radio/shows/episodes - Get paginated episodes across shows
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's station
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { radioStation: true },
    });

    let station = null;
    let allowedLanguages = ['English', 'Afrikaans', 'Xhosa'];
    let blockedCategories: string[] = [];

    if (session.user.userType === 'RADIO') {
      if (!user?.radioStation) {
        return NextResponse.json(
          { error: 'No station associated with user' },
          { status: 400 }
        );
      }

      station = user.radioStation;

      if (!station.isActive || !station.hasContentAccess) {
        return NextResponse.json(
          { error: 'Station does not have content access' },
          { status: 403 }
        );
      }

      allowedLanguages = station.allowedLanguages;
      blockedCategories = station.blockedCategories;
    } else if (session.user.userType !== 'STAFF') {
      return NextResponse.json(
        { error: 'Invalid user type for radio access' },
        { status: 403 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '12');
    const skip = (page - 1) * perPage;
    const showId = url.searchParams.get('showId');
    const language = url.searchParams.get('language');

    // Build show IDs filter
    let showIds: string[] | undefined;

    if (showId) {
      // If a specific show is selected, include its sub-shows' episodes too
      const selectedShow = await prisma.show.findUnique({
        where: { id: showId },
        include: {
          subShows: {
            where: { isActive: true, isPublished: true },
            select: { id: true },
          },
        },
      });

      if (selectedShow) {
        showIds = [selectedShow.id, ...selectedShow.subShows.map(s => s.id)];
      } else {
        showIds = [showId];
      }
    }

    // Build where clause for episodes
    const where: Prisma.EpisodeWhereInput = {
      status: 'PUBLISHED',
      show: {
        isActive: true,
        isPublished: true,
      },
    };

    if (showIds) {
      where.showId = { in: showIds };
    }

    // Filter by blocked categories (for RADIO users)
    if (session.user.userType === 'RADIO' && blockedCategories.length > 0) {
      where.show = {
        ...where.show as Prisma.ShowWhereInput,
        categoryId: { notIn: blockedCategories },
      };
    }

    // Filter by language classifications on the show
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
        where.show = {
          ...where.show as Prisma.ShowWhereInput,
          classifications: {
            some: {
              classificationId: { in: languageClassificationIds },
            },
          },
        };
      }
    }

    // Additional language filter (user-selected language)
    if (language && language !== 'all') {
      const langClassification = await prisma.classification.findFirst({
        where: {
          type: ClassificationType.LANGUAGE,
          name: language,
        },
        select: { id: true },
      });

      if (langClassification) {
        where.show = {
          ...where.show as Prisma.ShowWhereInput,
          classifications: {
            some: {
              classificationId: langClassification.id,
            },
          },
        };
      }
    }

    const [episodes, total] = await Promise.all([
      prisma.episode.findMany({
        where,
        include: {
          show: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              parentId: true,
              parent: {
                select: { id: true, title: true },
              },
              classifications: {
                include: { classification: true },
              },
            },
          },
          audioClips: true,
          publisher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.episode.count({ where }),
    ]);

    // Transform response
    const transformedEpisodes = episodes.map(ep => ({
      ...ep,
      show: {
        ...ep.show,
        classifications: ep.show.classifications.map(sc => sc.classification),
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
    console.error('Error fetching episodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
}
