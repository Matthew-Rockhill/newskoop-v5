import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/stories - Get filtered stories for radio stations
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
    let hasContentAccess = true;

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
      hasContentAccess = station.hasContentAccess;
    } else if (session.user.userType === 'STAFF') {
      // STAFF users can access all content without station restrictions
      station = {
        id: 'staff-access',
        name: 'Newskoop',
        allowedLanguages: ['English', 'Afrikaans', 'Xhosa'],
        allowedReligions: ['Christian', 'Muslim', 'Neutral'],
        hasContentAccess: true,
        isActive: true,
        blockedCategories: [],
      };
      allowedLanguages = station.allowedLanguages;
      hasContentAccess = station.hasContentAccess;
    } else {
      // Fallback for any unexpected user types
      return NextResponse.json(
        { error: 'Invalid user type for radio access' },
        { status: 403 }
      );
    }

    // Get query parameters for pagination and filtering
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;
    const category = url.searchParams.get('category'); // Category slug filter
    const subCategory = url.searchParams.get('subCategory'); // Sub-category slug filter
    const language = url.searchParams.get('language'); // Language filter

    // Parallel fetch: category lookups and tag filters
    const [subCategoryRecord, categoryRecord, languageTags, allowedReligions] = await Promise.all([
      // Sub-category lookup (only if subCategory param exists)
      subCategory ? prisma.category.findUnique({
        where: { slug: subCategory },
        select: { id: true, parentId: true },
      }) : null,

      // Category lookup (only if category param exists and no subCategory)
      category && !subCategory ? prisma.category.findUnique({
        where: { slug: category },
        select: { id: true, isParent: true, children: { select: { id: true } } },
      }) : null,

      // Language tags lookup
      prisma.tag.findMany({
        where: {
          category: 'LANGUAGE',
          name: {
            in: language && allowedLanguages.includes(language)
              ? [language]
              : allowedLanguages,
          },
        },
        select: { id: true },
      }),

      // Return allowed religions for next query
      Promise.resolve(
        session.user.userType === 'STAFF'
          ? ['Christian', 'Muslim', 'Neutral']
          : (station as any)?.allowedReligions || ['Christian', 'Muslim', 'Neutral']
      ),
    ]);

    // Get religion tags
    const religionTags = await prisma.tag.findMany({
      where: {
        category: 'RELIGION',
        name: { in: allowedReligions },
      },
      select: { id: true },
    });

    // Build the where clause for filtering
    const whereClause: any = {
      status: 'PUBLISHED',
      // Filter out stories from blocked categories
      categoryId: {
        notIn: station.blockedCategories,
      },
    };

    // Add sub-category filter if specified (takes precedence over category)
    if (subCategory && subCategoryRecord) {
      if (!(station.blockedCategories as string[]).includes(subCategoryRecord.id)) {
        // Filter to this specific sub-category only
        whereClause.categoryId = subCategoryRecord.id;
      } else {
        // Sub-category blocked - return no results
        whereClause.categoryId = 'invalid-category-id';
      }
    }
    // Add category filter if specified (and no subCategory)
    else if (category && categoryRecord) {
      if (!(station.blockedCategories as string[]).includes(categoryRecord.id)) {
        // If parent category, include all child categories
        if (categoryRecord.isParent && categoryRecord.children.length > 0) {
          const categoryIds = [
            categoryRecord.id,
            ...categoryRecord.children.map(c => c.id)
          ];
          whereClause.categoryId = { in: categoryIds };
        } else {
          // Regular category or no children - filter by this category only
          whereClause.categoryId = categoryRecord.id;
        }
      } else {
        // Category blocked - return no results
        whereClause.categoryId = 'invalid-category-id';
      }
    } else if ((subCategory && !subCategoryRecord) || (category && !categoryRecord)) {
      // Category/subcategory not found - return no results
      whereClause.categoryId = 'invalid-category-id';
    }

    // Build shared filter for both count and findMany
    const sharedWhere = {
      ...whereClause,
      AND: [
        // Must have at least one allowed language tag
        {
          tags: {
            some: {
              tagId: {
                in: languageTags.map(t => t.id),
              },
            },
          },
        },
        // Must have at least one allowed religion tag
        {
          tags: {
            some: {
              tagId: {
                in: religionTags.map(t => t.id),
              },
            },
          },
        },
      ],
    };

    // Parallel fetch: count and stories
    const [total, stories] = await Promise.all([
      prisma.story.count({ where: sharedWhere }),
      prisma.story.findMany({
        where: sharedWhere,
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
      }),
    ]);

    // Transform the data to include tag details
    const transformedStories = stories.map(story => ({
      ...story,
      tags: story.tags.map(st => st.tag),
    }));

    const responseData = {
      stories: transformedStories,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
      station: {
        name: station?.name || 'Newskoop',
        allowedLanguages: station?.allowedLanguages || ['English', 'Afrikaans', 'Xhosa'],
        allowedReligions: station?.allowedReligions || ['Christian', 'Muslim', 'Neutral'],
      },
    };

    // Return with cache headers for better performance
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache for 60 seconds, revalidate in background for 2 minutes
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
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