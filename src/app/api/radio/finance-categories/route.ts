import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/finance-categories - Get level 2 categories for Finance
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

    // Find Finance parent category
    const financeCategory = await prisma.category.findUnique({
      where: { slug: 'finance' },
    });

    if (!financeCategory) {
      return NextResponse.json(
        { error: 'Finance category not found' },
        { status: 404 }
      );
    }

    // Get level 2 categories under Finance
    const categories = await prisma.category.findMany({
      where: {
        parentId: financeCategory.id,
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
    console.error('Error fetching finance categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finance categories' },
      { status: 500 }
    );
  }
}