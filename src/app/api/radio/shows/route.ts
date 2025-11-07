import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';

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

    // Filter by language tags (for RADIO users only)
    if (session.user.userType === 'RADIO') {
      // Get allowed language tag IDs
      const languageTags = await prisma.tag.findMany({
        where: {
          category: 'LANGUAGE',
          name: { in: allowedLanguages },
        },
        select: { id: true },
      });

      const languageTagIds = languageTags.map(tag => tag.id);

      if (languageTagIds.length > 0) {
        where.tags = {
          some: {
            tagId: { in: languageTagIds },
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

    return NextResponse.json({
      shows,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
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
