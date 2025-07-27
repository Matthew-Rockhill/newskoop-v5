import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';

// GET /api/newsroom/translations/[id]
const getTranslation = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const translation = await prisma.translation.findUnique({
      where: { id },
      include: {
        originalStory: {
          include: {
            author: true,
            category: true,
          },
        },
        assignedTo: true,
      },
    });
    if (!translation) {
      return Response.json({ error: 'Translation not found' }, { status: 404 });
    }
    return Response.json({ translation });
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/translations/[id]
const updateTranslation = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const data = await req.json();
    const translation = await prisma.translation.update({
      where: { id },
      data,
    });
    return Response.json({ translation });
  },
  [withErrorHandling, withAuth]
);

export { getTranslation as GET, updateTranslation as PATCH }; 