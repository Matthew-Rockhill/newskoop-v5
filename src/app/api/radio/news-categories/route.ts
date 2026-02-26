import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/news-categories - Get level 2 categories for News Stories
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is a radio user
    if (!session?.user || session.user.userType !== 'RADIO') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find News Stories parent category
    const newsStoriesCategory = await prisma.category.findUnique({
      where: { slug: 'news-stories' },
    });

    if (!newsStoriesCategory) {
      return NextResponse.json(
        { error: 'News Stories category not found' },
        { status: 404 }
      );
    }

    // Get level 2 categories under News Stories
    const categories = await prisma.category.findMany({
      where: {
        parentId: newsStoriesCategory.id,
        level: 2,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      categories,
    });

  } catch (error) {
    console.error('Error fetching news categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news categories' },
      { status: 500 }
    );
  }
}