import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/sports-categories - Get level 2 categories for Sports
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

    // Find Sports parent category
    const sportsCategory = await prisma.category.findUnique({
      where: { slug: 'sports' },
    });

    if (!sportsCategory) {
      return NextResponse.json(
        { error: 'Sports category not found' },
        { status: 404 }
      );
    }

    // Get level 2 categories under Sports
    const categories = await prisma.category.findMany({
      where: {
        parentId: sportsCategory.id,
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
    console.error('Error fetching sports categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sports categories' },
      { status: 500 }
    );
  }
}