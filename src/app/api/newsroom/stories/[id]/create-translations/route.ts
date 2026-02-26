import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { z } from 'zod';
import { ClassificationType } from '@prisma/client';
import { generateSlug, generateUniqueStorySlug } from '@/lib/slug-utils';

const translationRequestSchema = z.object({
  translations: z.array(z.object({
    language: z.enum(['AFRIKAANS', 'XHOSA']), // Only support languages defined in StoryLanguage enum
    assignedToId: z.string()
  }))
});

// POST /api/newsroom/stories/[id]/create-translations - Create translations for a story
const createTranslations = createHandler(
  async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const _user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const params = await context.params;
    const storyId = params.id;

    // Parse request body
    const body = await req.json();
    const { translations } = translationRequestSchema.parse(body);

    // Fetch original story
    const originalStory = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        audioClips: {
          select: { audioClipId: true },
        },
        tags: {
          include: {
            tag: true
          }
        },
        classifications: {
          include: {
            classification: true
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
      // Generate slug with language suffix using optimized single-query approach
      const baseSlug = `${generateSlug(originalStory.title)}-${translation.language.toLowerCase()}`;
      const slug = await generateUniqueStorySlug(baseSlug);

      // Prepare tags - keep all non-language tags
      const tagConnections = originalStory.tags.map(st => ({
        tag: { connect: { id: st.tagId } }
      }));

      // Prepare classifications - replace ENGLISH language classification with target language
      const classificationConnections = originalStory.classifications
        .filter(sc => sc.classification.type !== ClassificationType.LANGUAGE) // Remove language classifications
        .map(sc => ({
          classification: { connect: { id: sc.classificationId } }
        }));

      // Add target language classification
      const languageClassification = await prisma.classification.findFirst({
        where: {
          type: ClassificationType.LANGUAGE,
          name: translation.language.charAt(0) + translation.language.slice(1).toLowerCase()
        }
      });

      if (languageClassification) {
        classificationConnections.push({
          classification: { connect: { id: languageClassification.id } }
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
          // Link same audio clips from original story (shared references, not copies)
          audioClips: {
            create: originalStory.audioClips.map(link => ({
              audioClipId: link.audioClipId,
              addedBy: translation.assignedToId,
            }))
          },
          // Copy tags
          tags: {
            create: tagConnections
          },
          // Copy classifications (with language replacement)
          classifications: {
            create: classificationConnections
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
                }
              }
            }
          },
          audioClips: {
            select: {
              id: true,
              audioClip: {
                select: {
                  id: true,
                  filename: true,
                  originalName: true,
                  url: true,
                  duration: true,
                },
              },
            },
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
