import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma, ClassificationType } from '@prisma/client';

// GET /api/radio/shows - Get filtered shows for radio stations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user's station
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { radioStation: true },
    });

    // Handle different user types
    let station = null;
    let allowedLanguages = ['English', 'Afrikaans', 'Xhosa']; // Default for STAFF users
    let allowedReligions = ['Christian', 'Muslim', 'Neutral'];
    let blockedCategories: string[] = [];

    if (session.user.userType === 'RADIO') {
      // Radio users must have an associated station
      if (!user?.radioStation) {
        return NextResponse.json(
          { error: 'No station associated with user' },
          { status: 400 }
        );
      }

      station = user.radioStation;

      // Check if station has content access
      if (!station.isActive || !station.hasContentAccess) {
        return NextResponse.json(
          { error: 'Station does not have content access' },
          { status: 403 }
        );
      }

      allowedLanguages = station.allowedLanguages;
      allowedReligions = station.allowedReligions;
      blockedCategories = station.blockedCategories;
    } else if (session.user.userType === 'STAFF') {
      // STAFF users can access all content without restrictions
      // No filtering needed
    } else {
      return NextResponse.json(
        { error: 'Invalid user type for radio access' },
        { status: 403 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;
    const categorySlug = url.searchParams.get('category');

    // Build where clause
    const where: Prisma.ShowWhereInput = {
      isActive: true,
      isPublished: true,
    };

    // Filter by category if specified
    if (categorySlug) {
      where.category = {
        slug: categorySlug,
      };
    }

    // Filter by blocked categories (for RADIO users only)
    if (session.user.userType === 'RADIO' && blockedCategories.length > 0) {
      where.categoryId = {
        notIn: blockedCategories,
      };
    }

    // Filter by language classifications (for RADIO users only)
    if (session.user.userType === 'RADIO') {
      // Get allowed language classification IDs
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

    // Get total count
    const total = await prisma.show.count({ where });

    // Get shows
    const shows = await prisma.show.findMany({
      where,
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
        _count: {
          select: {
            episodes: {
              where: {
                status: 'PUBLISHED',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: perPage,
    });

    // Flatten tags and classifications for easier client-side use
    const transformedShows = shows.map(show => ({
      ...show,
      tags: show.tags.map(st => st.tag),
      classifications: show.classifications.map(sc => sc.classification),
    }));

    return NextResponse.json({
      shows: transformedShows,
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
    console.error('Error fetching shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shows' },
      { status: 500 }
    );
  }
}
