import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClassificationType } from '@prisma/client';

// GET /api/radio/shows/[id] - Get a single show
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

    const showRaw = await prisma.show.findUnique({
      where: {
        id,
        isActive: true,
        isPublished: true,
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        classifications: {
          include: {
            classification: true,
          },
        },
        parent: {
          select: { id: true, title: true, slug: true },
        },
        subShows: {
          where: { isActive: true, isPublished: true },
          include: {
            classifications: {
              include: { classification: true },
            },
            _count: {
              select: {
                episodes: { where: { status: 'PUBLISHED' } },
              },
            },
          },
          orderBy: { title: 'asc' },
        },
        episodes: {
          where: {
            status: 'PUBLISHED',
          },
          include: {
            audioClips: true,
          },
          orderBy: {
            episodeNumber: 'desc',
          },
        },
      },
    });

    if (!showRaw) {
      return NextResponse.json(
        { error: 'Show not found' },
        { status: 404 }
      );
    }

    // For RADIO users, check station permissions
    if (session.user.userType === 'RADIO') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { radioStation: true },
      });

      if (!user?.radioStation) {
        return NextResponse.json(
          { error: 'No station associated with user' },
          { status: 400 }
        );
      }

      const station = user.radioStation;

      // Check if category is blocked
      if (showRaw.categoryId && station.blockedCategories.includes(showRaw.categoryId)) {
        return NextResponse.json(
          { error: 'This show is not available for your station' },
          { status: 403 }
        );
      }

      // Check language classifications
      const languageClassifications = showRaw.classifications
        .filter(sc => sc.classification.type === ClassificationType.LANGUAGE)
        .map(sc => sc.classification.name);

      const hasAllowedLanguage = languageClassifications.some(lang =>
        station.allowedLanguages.includes(lang)
      );

      if (languageClassifications.length > 0 && !hasAllowedLanguage) {
        return NextResponse.json(
          { error: 'This show is not available in your allowed languages' },
          { status: 403 }
        );
      }
    }

    // Flatten tags and classifications
    const show = {
      ...showRaw,
      tags: showRaw.tags.map(st => st.tag),
      classifications: showRaw.classifications.map(sc => sc.classification),
      subShows: showRaw.subShows.map(sub => ({
        ...sub,
        classifications: sub.classifications.map(sc => sc.classification),
      })),
    };

    return NextResponse.json({ show });
  } catch (error) {
    console.error('Error fetching show:', error);
    return NextResponse.json(
      { error: 'Failed to fetch show' },
      { status: 500 }
    );
  }
}
