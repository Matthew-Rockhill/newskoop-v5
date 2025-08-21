import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/stories/[id] - Get individual story for radio stations
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        audioClips: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            duration: true,
            fileSize: true,
            mimeType: true,
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
    if (story.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Story not available' },
        { status: 403 }
      );
    }

    // Check if story category is blocked by station
    if (story.categoryId && station.blockedCategories.includes(story.categoryId)) {
      return NextResponse.json(
        { error: 'Story not available for your station' },
        { status: 403 }
      );
    }

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

    // Check if story has allowed language tag
    const storyLanguageTags = story.tags.filter(st => 
      languageTags.some(lt => lt.id === st.tagId)
    );

    if (storyLanguageTags.length === 0) {
      return NextResponse.json(
        { error: 'Story not available in allowed languages' },
        { status: 403 }
      );
    }

    // Check if story has allowed religion tag
    const storyReligionTags = story.tags.filter(st => 
      religionTags.some(rt => rt.id === st.tagId)
    );

    if (storyReligionTags.length === 0) {
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
        name: station.name,
        allowedLanguages: station.allowedLanguages,
        allowedReligions: station.allowedReligions,
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