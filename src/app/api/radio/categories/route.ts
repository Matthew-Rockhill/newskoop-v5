import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/categories - Get categories available to the radio station
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
    if (session.user.userType === 'RADIO') {
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
    } else if (session.user.userType === 'STAFF') {
      // STAFF users get access to all categories
      station = {
        id: 'staff-access',
        name: 'Newskoop',
        allowedLanguages: ['English', 'Afrikaans', 'Xhosa'],
        hasContentAccess: true,
        isActive: true,
        blockedCategories: [],
      };
    }

    // Get all level 1 categories that are not blocked by the station
    const categories = await prisma.category.findMany({
      where: {
        level: 1,
        isParent: true,
        id: {
          notIn: station?.blockedCategories || [],
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get story counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        // Get language tags that match station's allowed languages
        const languageTags = await prisma.tag.findMany({
          where: {
            category: 'LANGUAGE',
            name: {
              in: station?.allowedLanguages || [],
            },
          },
          select: { id: true },
        });

        // Get religion tags that match station's allowed religions  
        const religionTags = await prisma.tag.findMany({
          where: {
            category: 'RELIGION',
            name: {
              in: station?.allowedReligions || [],
            },
          },
          select: { id: true },
        });

        // Count stories in this category that match station filters
        const storyCount = await prisma.story.count({
          where: {
            status: 'PUBLISHED',
            categoryId: category.id,
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

        return {
          ...category,
          storyCount,
        };
      })
    );

    return NextResponse.json({
      categories: categoriesWithCounts,
      station: {
        name: station?.name || 'Unknown',
        allowedLanguages: station?.allowedLanguages || [],
        allowedReligions: station?.allowedReligions || [],
        blockedCategories: station?.blockedCategories || [],
      },
    });

  } catch (error) {
    console.error('Error fetching radio categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}