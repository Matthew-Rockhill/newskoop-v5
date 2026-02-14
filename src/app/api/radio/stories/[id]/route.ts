import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClassificationType } from '@prisma/client';

// GET /api/radio/stories/[id] - Get individual story for radio stations
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get the story
    const story = await prisma.story.findUnique({
      where: { id },
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
                fileSize: true,
                mimeType: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Check if story is published
    if (story.stage !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Story not available' },
        { status: 403 }
      );
    }

    // Check if story category is blocked by station
    if (story.categoryId && (station as any).blockedCategories?.includes(story.categoryId)) {
      return NextResponse.json(
        { error: 'Story not available for your station' },
        { status: 403 }
      );
    }

    // Get religion classifications - for STAFF users, include all religions
    const allowedReligions = session.user.userType === 'STAFF'
      ? ['Christian', 'Muslim', 'Neutral'] // All religions for staff
      : (station as any)?.allowedReligions || ['Christian', 'Muslim', 'Neutral'];

    // Fetch language and religion classifications in parallel for better performance
    const [languageClassifications, religionClassifications] = await Promise.all([
      prisma.classification.findMany({
        where: {
          type: ClassificationType.LANGUAGE,
          isActive: true,
          name: { in: allowedLanguages },
        },
        select: { id: true },
      }),
      prisma.classification.findMany({
        where: {
          type: ClassificationType.RELIGION,
          isActive: true,
          name: { in: allowedReligions },
        },
        select: { id: true },
      }),
    ]);

    // Check if story has allowed language classification
    const storyLanguageClassifications = story.classifications.filter(sc =>
      languageClassifications.some(lc => lc.id === sc.classificationId)
    );

    if (storyLanguageClassifications.length === 0) {
      return NextResponse.json(
        { error: 'Story not available in allowed languages' },
        { status: 403 }
      );
    }

    // Check if story has allowed religion classification
    const storyReligionClassifications = story.classifications.filter(sc =>
      religionClassifications.some(rc => rc.id === sc.classificationId)
    );

    if (storyReligionClassifications.length === 0) {
      return NextResponse.json(
        { error: 'Story not available for allowed religions' },
        { status: 403 }
      );
    }

    // Transform the data to include tag details
    const transformedStory = {
      ...story,
      tags: story.tags.map(st => st.tag),
    };

    return NextResponse.json({
      story: transformedStory,
      station: {
        name: station?.name || 'Newskoop',
        allowedLanguages: allowedLanguages,
        allowedReligions: allowedReligions,
      },
    });

  } catch (error) {
    console.error('Error fetching radio story:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}