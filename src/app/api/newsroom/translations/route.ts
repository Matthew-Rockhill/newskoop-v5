import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';

const getTranslations = createHandler(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const assignedToId = url.searchParams.get('assignedToId');
    const where: Record<string, unknown> = {};
    if (assignedToId) where.assignedToId = assignedToId;

    const translations = await prisma.translation.findMany({
      where,
      include: {
        originalStory: {
          include: {
            author: true,
            category: true,
          },
        },
        assignedTo: true,
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