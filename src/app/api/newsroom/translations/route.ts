import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';

const getTranslations = createHandler(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    const status = url.searchParams.get('status');
    const assignedToId = url.searchParams.get('assignedToId');
    const targetLanguage = url.searchParams.get('targetLanguage');
    
    const where: Record<string, unknown> = {};
    
    // Add filters
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (targetLanguage) where.targetLanguage = targetLanguage;
    
    // Add search query
    if (query) {
      where.OR = [
        {
          originalStory: {
            title: { contains: query, mode: 'insensitive' }
          }
        },
        {
          translatedStory: {
            title: { contains: query, mode: 'insensitive' }
          }
        }
      ];
    }

    const translations = await prisma.translation.findMany({
      where,
      include: {
        originalStory: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            },
            category: {
              select: {
                id: true,
                name: true,
              }
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        translatedStory: {
          select: {
            id: true,
            title: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ translations });
  },
  [withErrorHandling, withAuth]
);

const createTranslation = createHandler(
  async (req: NextRequest) => {
    const { originalStoryId, assignedToId, targetLanguage } = await req.json();
    if (!originalStoryId || !assignedToId || !targetLanguage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const translation = await prisma.translation.create({
      data: {
        originalStoryId,
        assignedToId,
        targetLanguage,
        status: 'PENDING',
      },
    });
    return NextResponse.json(translation, { status: 201 });
  },
  [withErrorHandling, withAuth]
);

export { getTranslations as GET };
export { createTranslation as POST }; 