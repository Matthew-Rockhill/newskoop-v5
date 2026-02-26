import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClassificationType } from '@prisma/client';

// GET /api/radio/categories - Get categories available to the radio station
export async function GET(_req: NextRequest) {
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
        allowedReligions: ['Christian', 'Muslim', 'Neutral'],
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
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            level: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    // Define the desired display order
    const categoryOrder = [
      'news-stories',
      'news-bulletins',
      'finance',
      'sports',
    ];

    // Sort categories by the defined order
    const sortedCategories = categories.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.slug);
      const indexB = categoryOrder.indexOf(b.slug);

      // If not in order array, put at end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });

    // Fetch language and religion classifications once (outside the loop)
    const [languageClassifications, religionClassifications] = await Promise.all([
      prisma.classification.findMany({
        where: {
          type: ClassificationType.LANGUAGE,
          isActive: true,
          name: {
            in: station?.allowedLanguages || [],
          },
        },
        select: { id: true },
      }),
      prisma.classification.findMany({
        where: {
          type: ClassificationType.RELIGION,
          isActive: true,
          name: {
            in: station?.allowedReligions || [],
          },
        },
        select: { id: true },
      }),
    ]);

    // Get story counts for each category in parallel
    const categoriesWithCounts = await Promise.all(
      sortedCategories.map(async (category) => {
        // Count stories in this category AND all child categories
        // Build category IDs to include parent and all children
        const categoryIds = [category.id];
        if (category.children && category.children.length > 0) {
          categoryIds.push(...category.children.map(c => c.id));
        }

        const storyCount = await prisma.story.count({
          where: {
            stage: 'PUBLISHED',
            categoryId: {
              in: categoryIds,
            },
            AND: [
              // Must have at least one allowed language classification
              {
                classifications: {
                  some: {
                    classificationId: {
                      in: languageClassifications.map((c: { id: string }) => c.id),
                    },
                  },
                },
              },
              // Must have at least one allowed religion classification
              {
                classifications: {
                  some: {
                    classificationId: {
                      in: religionClassifications.map((c: { id: string }) => c.id),
                    },
                  },
                },
              },
            ],
          },
        });

        return {
          ...category,
          storyCount,
        };
      })
    );

    const responseData = {
      categories: categoriesWithCounts,
      station: {
        name: station?.name || 'Unknown',
        allowedLanguages: station?.allowedLanguages || [],
        allowedReligions: station?.allowedReligions || [],
        blockedCategories: station?.blockedCategories || [],
      },
    };

    // Return with cache headers for better performance
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache for 2 minutes, revalidate in background for 5 minutes
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
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