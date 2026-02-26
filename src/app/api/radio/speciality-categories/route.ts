import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/speciality-categories - Get level 2 categories for Speciality
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

    // Find Speciality parent category
    const specialityCategory = await prisma.category.findUnique({
      where: { slug: 'speciality' },
    });

    if (!specialityCategory) {
      return NextResponse.json(
        { error: 'Speciality category not found' },
        { status: 404 }
      );
    }

    // Get level 2 categories under Speciality
    const categories = await prisma.category.findMany({
      where: {
        parentId: specialityCategory.id,
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
    console.error('Error fetching speciality categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch speciality categories' },
      { status: 500 }
    );
  }
}