import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClassificationType } from '@prisma/client';

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
    let _hasContentAccess = true;

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
      _hasContentAccess = station.hasContentAccess;
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
      _hasContentAccess = station.hasContentAccess;
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

    // Compute allowed religions before parallel fetch
    const allowedReligions = session.user.userType === 'STAFF'
      ? ['Christian', 'Muslim', 'Neutral']
      : (station as any)?.allowedReligions || ['Christian', 'Muslim', 'Neutral'];

    // Parallel fetch: category lookups and classification filters (all queries in parallel for performance)
    const [subCategoryRecord, categoryRecord, languageClassifications, religionClassifications] = await Promise.all([
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

      // Language classifications lookup
      prisma.classification.findMany({
        where: {
          type: ClassificationType.LANGUAGE,
          isActive: true,
          name: {
            in: language && allowedLanguages.includes(language)
              ? [language]
              : allowedLanguages,
          },
        },
        select: { id: true },
      }),

      // Religion classifications lookup (now in parallel)
      prisma.classification.findMany({
        where: {
          type: ClassificationType.RELIGION,
          isActive: true,
          name: { in: allowedReligions },
        },
        select: { id: true },
      }),
    ]);

    // Build the where clause for filtering
    const whereClause: any = {
      stage: 'PUBLISHED',
      // Filter out stories from blocked categories
      categoryId: {
        notIn: station.blockedCategories,
      },
    };

    // Add sub-category filter if specified (takes precedence over category)
    if (subCategory && subCategoryRecord) {
      const blockedCategories = station.blockedCategories as string[];
      // Check if sub-category itself is blocked OR its parent is blocked
      const isSubCategoryBlocked = blockedCategories.includes(subCategoryRecord.id);
      const isParentBlocked = subCategoryRecord.parentId && blockedCategories.includes(subCategoryRecord.parentId);

      if (!isSubCategoryBlocked && !isParentBlocked) {
        // Filter to this specific sub-category only
        whereClause.categoryId = subCategoryRecord.id;
      } else {
        // Sub-category or parent blocked - return no results
        whereClause.categoryId = 'invalid-category-id';
      }
    }
    // Add category filter if specified (and no subCategory)
    else if (category && categoryRecord) {
      const blockedCategories = station.blockedCategories as string[];
      if (!blockedCategories.includes(categoryRecord.id)) {
        // If parent category, include all non-blocked child categories
        if (categoryRecord.isParent && categoryRecord.children.length > 0) {
          const allowedChildIds = categoryRecord.children
            .filter(c => !blockedCategories.includes(c.id))
            .map(c => c.id);
          const categoryIds = [
            categoryRecord.id,
            ...allowedChildIds
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
          classifications: {
            include: {
              classification: true,
            },
          },
          audioClips: {
            select: {
              id: true,
              audioClip: {
                select: {
                  id: true,
                  filename: true,
                  originalName: true,
                  url: true,
                  duration: true,
                },
              },
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

    // Transform the data to include tag and classification details
    const transformedStories = stories.map(story => ({
      ...story,
      tags: story.tags.map((st: any) => st.tag),
      classifications: story.classifications.map((sc: any) => sc.classification),
      audioClips: story.audioClips.map((sac: any) => sac.audioClip),
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