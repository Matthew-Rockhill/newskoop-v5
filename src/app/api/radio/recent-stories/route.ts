import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/recent-stories - Get recent stories by category
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

    const { searchParams } = new URL(req.url);
    const categoryName = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '6');

    if (!categoryName) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      );
    }

    // Get the user's station to apply filters
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

    // Find the category
    const category = await prisma.category.findFirst({
      where: { 
        name: categoryName,
        level: 2,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
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

    // Get recent stories in this category that match station filters
    const stories = await prisma.story.findMany({
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
      include: {
        audioClips: {
          select: {
            id: true,
            duration: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({
      stories: stories.map(story => ({
        id: story.id,
        title: story.title,
        content: story.content,
        publishedAt: story.publishedAt,
        audioClips: story.audioClips,
        tags: story.tags.map(t => t.tag),
      })),
      category: {
        name: category.name,
        description: category.description,
      },
    });

  } catch (error) {
    console.error('Error fetching recent stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent stories' },
      { status: 500 }
    );
  }
}