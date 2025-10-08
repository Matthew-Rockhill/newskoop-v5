import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { z } from 'zod';

const translationRequestSchema = z.object({
  translations: z.array(z.object({
    language: z.enum(['AFRIKAANS', 'XHOSA']), // Only support languages defined in StoryLanguage enum
    assignedToId: z.string()
  }))
});

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// POST /api/newsroom/stories/[id]/create-translations - Create translations for a story
const createTranslations = createHandler(
  async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const params = await context.params;
    const storyId = params.id;

    // Parse request body
    const body = await req.json();
    const { translations } = translationRequestSchema.parse(body);

    // Fetch original story
    const originalStory = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        audioClips: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!originalStory) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Validate story is approved
    if (originalStory.stage !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Only approved stories can be translated' },
        { status: 400 }
      );
    }

    // Create translations
    const createdTranslations = [];

    for (const translation of translations) {
      // Generate slug with language suffix
      const baseSlug = generateSlug(originalStory.title);
      let slug = `${baseSlug}-${translation.language.toLowerCase()}`;

      // Check for duplicates and add counter if needed
      const slugExists = await prisma.story.findFirst({
        where: { slug }
      });

      if (slugExists) {
        let counter = 1;
        let uniqueSlug = `${slug}-${counter}`;
        while (await prisma.story.findFirst({ where: { slug: uniqueSlug } })) {
          counter++;
          uniqueSlug = `${slug}-${counter}`;
        }
        slug = uniqueSlug;
      }

      // Prepare tags - replace ENGLISH language tag with target language
      const tagConnections = originalStory.tags
        .filter(st => st.tag.category !== 'LANGUAGE') // Remove language tags
        .map(st => ({
          tag: { connect: { id: st.tagId } }
        }));

      // Add target language tag
      const languageTag = await prisma.tag.findFirst({
        where: {
          category: 'LANGUAGE',
          name: translation.language.charAt(0) + translation.language.slice(1).toLowerCase()
        }
      });

      if (languageTag) {
        tagConnections.push({
          tag: { connect: { id: languageTag.id } }
        });
      }

      // Create translation story
      const translationStory = await prisma.story.create({
        data: {
          title: originalStory.title, // Keep same title initially - translator can change
          content: '', // Empty content for translator to fill
          slug,
          isTranslation: true,
          originalStoryId: originalStory.id,
          language: translation.language,
          authorId: translation.assignedToId,
          categoryId: originalStory.categoryId,
          stage: 'DRAFT',
          status: 'DRAFT',
          // Copy audio clips
          audioClips: {
            create: originalStory.audioClips.map(clip => ({
              filename: clip.filename,
              originalName: clip.originalName,
              url: clip.url,
              fileSize: clip.fileSize,
              mimeType: clip.mimeType,
              duration: clip.duration,
              uploadedBy: translation.assignedToId
            }))
          },
          // Copy tags (with language replacement)
          tags: {
            create: tagConnections
          }
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true
            }
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  color: true,
                  category: true
                }
              }
            }
          },
          audioClips: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              url: true,
              duration: true
            }
          }
        }
      });

      createdTranslations.push(translationStory);
    }

    return NextResponse.json(
      {
        message: `Created ${createdTranslations.length} translation(s)`,
        translations: createdTranslations
      },
      { status: 201 }
    );
  },
  [
    withErrorHandling,
    withAuth,
    withAudit('story.create_translations')
  ]
);

export { createTranslations as POST };
