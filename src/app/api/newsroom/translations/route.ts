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
    const body = await req.json();
    
    // Support both single translation (legacy) and multiple translations (new)
    if (body.translations && Array.isArray(body.translations)) {
      // New multiple translation format
      const { originalStoryId, translations } = body;
      if (!originalStoryId || !translations || translations.length === 0) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Validate all translations have required fields
      for (const translation of translations) {
        if (!translation.assignedToId || !translation.targetLanguage) {
          return NextResponse.json({ error: 'All translations must have assignedToId and targetLanguage' }, { status: 400 });
        }
      }

      // Create all translations and update original story status in a transaction
      const results = await prisma.$transaction(async (tx) => {
        // Get original story to copy data from
        const originalStory = await tx.story.findUnique({
          where: { id: originalStoryId },
          include: {
            audioClips: true,
            tags: true,
            category: true,
          },
        });

        if (!originalStory) {
          throw new Error('Original story not found');
        }

        // Validate story status - must be APPROVED to send for translation
        if (originalStory.status !== 'APPROVED') {
          throw new Error(`Story must be in APPROVED status to send for translation. Current status: ${originalStory.status}`);
        }

        // Check for existing translation requests to prevent duplicates
        const existingTranslations = await tx.translation.findMany({
          where: { originalStoryId },
          select: { targetLanguage: true, status: true },
        });

        const existingLanguages = existingTranslations.map(t => t.targetLanguage);
        const requestedLanguages = translations.map((t: { targetLanguage: string }) => t.targetLanguage);
        const duplicateLanguages = requestedLanguages.filter((lang: string) => existingLanguages.includes(lang));

        if (duplicateLanguages.length > 0) {
          throw new Error(`Translation requests already exist for: ${duplicateLanguages.join(', ')}. Please check existing translations.`);
        }

        const createdTranslations = [];

        // Create each translation
        for (const translationData of translations) {
          const translation = await tx.translation.create({
            data: {
              originalStoryId,
              assignedToId: translationData.assignedToId,
              targetLanguage: translationData.targetLanguage,
              status: 'PENDING',
            },
          });
          createdTranslations.push(translation);
        }

        // Only update story status to PENDING_TRANSLATION if currently APPROVED
        if (originalStory.status === 'APPROVED') {
          await tx.story.update({
            where: { id: originalStoryId },
            data: { status: 'PENDING_TRANSLATION' },
          });
        }

        return createdTranslations;
      });

      return NextResponse.json({ translations: results }, { status: 201 });
    } else {
      // Legacy single translation format
      const { originalStoryId, assignedToId, targetLanguage } = body;
      if (!originalStoryId || !assignedToId || !targetLanguage) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Create translation and update original story status in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get original story to validate status
        const originalStory = await tx.story.findUnique({
          where: { id: originalStoryId },
          select: { status: true },
        });

        if (!originalStory) {
          throw new Error('Original story not found');
        }

        // Validate story status - must be APPROVED to send for translation
        if (originalStory.status !== 'APPROVED') {
          throw new Error(`Story must be in APPROVED status to send for translation. Current status: ${originalStory.status}`);
        }

        // Check for existing translation in this language
        const existingTranslation = await tx.translation.findFirst({
          where: {
            originalStoryId,
            targetLanguage,
          },
        });

        if (existingTranslation) {
          throw new Error(`Translation request already exists for ${targetLanguage}. Please check existing translations.`);
        }

        const translation = await tx.translation.create({
          data: {
            originalStoryId,
            assignedToId,
            targetLanguage,
            status: 'PENDING',
          },
        });

        // Only update story status to PENDING_TRANSLATION if currently APPROVED
        if (originalStory.status === 'APPROVED') {
          await tx.story.update({
            where: { id: originalStoryId },
            data: { status: 'PENDING_TRANSLATION' },
          });
        }

        return translation;
      });

      return NextResponse.json(result, { status: 201 });
    }
  },
  [withErrorHandling, withAuth]
);

export { getTranslations as GET };
export { createTranslation as POST }; 