import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/stories - Get filtered stories for radio stations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is a radio user
    if (!session?.user || session.user.userType !== 'RADIO') {
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

    if (!user?.radioStation) {
      return NextResponse.json(
        { error: 'No station associated with user' },
        { status: 400 }
      );
    }

    const station = user.radioStation;

    // Check if station has content access
    if (!station.isActive || !station.hasContentAccess) {
      return NextResponse.json(
        { error: 'Station does not have content access' },
        { status: 403 }
      );
    }

    // Get query parameters for pagination
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;

    // Build the where clause for filtering
    const whereClause: any = {
      status: 'PUBLISHED',
      // Filter out stories from blocked categories
      categoryId: {
        notIn: station.blockedCategories,
      },
    };

    // Get language tags that match station's allowed languages
    const languageTags = await prisma.tag.findMany({
      where: {
        category: 'LANGUAGE',
        name: {
          in: station.allowedLanguages,
        },
      },
      select: { id: true },
    });

    // Get religion tags that match station's allowed religions
    const religionTags = await prisma.tag.findMany({
      where: {
        category: 'RELIGION',
        name: {
          in: station.allowedReligions,
        },
      },
      select: { id: true },
    });

    // Get total count
    const total = await prisma.story.count({
      where: {
        ...whereClause,
        // Must have at least one allowed language tag
        tags: {
          some: {
            tagId: {
              in: languageTags.map(t => t.id),
            },
          },
        },
        // Must have at least one allowed religion tag
        AND: {
          tags: {
            some: {
              tagId: {
                in: religionTags.map(t => t.id),
              },
            },
          },
        },
      },
    });

    // Get filtered stories
    const stories = await prisma.story.findMany({
      where: {
        ...whereClause,
        // Must have at least one allowed language tag
        tags: {
          some: {
            tagId: {
              in: languageTags.map(t => t.id),
            },
          },
        },
        // Must have at least one allowed religion tag
        AND: {
          tags: {
            some: {
              tagId: {
                in: religionTags.map(t => t.id),
              },
            },
          },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        audioClips: {
          select: {
            id: true,
            filename: true,
            url: true,
            duration: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      skip,
      take: perPage,
    });

    // Transform the data to include tag details
    const transformedStories = stories.map(story => ({
      ...story,
      tags: story.tags.map(st => st.tag),
    }));

    return NextResponse.json({
      stories: transformedStories,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
      station: {
        name: station.name,
        allowedLanguages: station.allowedLanguages,
        allowedReligions: station.allowedReligions,
      },
    });
  } catch (error) {
    console.error('Error fetching radio stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}