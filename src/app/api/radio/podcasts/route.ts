import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma, ClassificationType } from '@prisma/client';

// GET /api/radio/podcasts - Get filtered podcasts for radio stations
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
    let _allowedReligions = ['Christian', 'Muslim', 'Neutral'];
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
      _allowedReligions = station.allowedReligions;
      blockedCategories = station.blockedCategories;
    } else if (session.user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Invalid user type for radio access' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;
    const categorySlug = url.searchParams.get('category');

    const where: Prisma.PodcastWhereInput = {
      isActive: true,
      isPublished: true,
    };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (session.user.userType === 'RADIO' && blockedCategories.length > 0) {
      where.categoryId = { notIn: blockedCategories };
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
        where.classifications = {
          some: {
            classificationId: { in: languageClassificationIds },
          },
        };
      }
    }

    const total = await prisma.podcast.count({ where });

    const podcasts = await prisma.podcast.findMany({
      where,
      include: {
        category: true,
        classifications: {
          include: { classification: true },
        },
        _count: {
          select: {
            episodes: { where: { status: 'PUBLISHED' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    });

    const transformedPodcasts = podcasts.map(podcast => ({
      ...podcast,
      classifications: podcast.classifications.map(pc => pc.classification),
    }));

    return NextResponse.json({
      podcasts: transformedPodcasts,
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
    console.error('Error fetching podcasts:', error);
    return NextResponse.json({ error: 'Failed to fetch podcasts' }, { status: 500 });
  }
}
