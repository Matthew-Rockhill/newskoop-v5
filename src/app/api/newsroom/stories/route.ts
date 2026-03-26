import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { storyCreateSchema, storySearchSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { saveUploadedFile, validateAudioFile } from '@/lib/file-upload';
import { deleteAudioFile } from '@/lib/r2-storage';
import { generateSlug, generateUniqueStorySlug, isSlugConflictError } from '@/lib/slug-utils';
import { publishStoryEvent, createEvent } from '@/lib/ably';

// Helper function to check permissions
function hasStoryPermission(userRole: string | null, action: 'create' | 'read' | 'update' | 'delete') {
  // If no staff role, deny access to newsroom features
  if (!userRole) {
    return false;
  }
  
  const permissions = {
    INTERN: ['create', 'read'],
    JOURNALIST: ['create', 'read', 'update'],
    SUB_EDITOR: ['create', 'read', 'update'],
    EDITOR: ['create', 'read', 'update', 'delete'],
    ADMIN: ['create', 'read', 'update', 'delete'],
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
  };
  
  return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
}

// GET /api/newsroom/stories - List stories with filtering and pagination
const getStories = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    
    if (!hasStoryPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams);
    
    const {
      query,
      status,
      stage,
      language,
      categoryId,
      authorId,
      assignedToId,
      reviewerId,
      assignedReviewerId,
      assignedApproverId,
      originalStoryId,
      isTranslation,
      tagIds,
      flaggedForBulletin,
      sortFlaggedFirst,
      page = 1,
      perPage = 10
    } = storySearchSchema.parse({
      ...searchParams,
      page: searchParams.page ? Number(searchParams.page) : 1,
      perPage: searchParams.perPage ? Number(searchParams.perPage) : 10,
      isTranslation: searchParams.isTranslation === 'true' ? true : searchParams.isTranslation === 'false' ? false : undefined,
      tagIds: searchParams.tagIds ? searchParams.tagIds.split(',') : undefined,
      flaggedForBulletin: searchParams.flaggedForBulletin === 'true' ? true : searchParams.flaggedForBulletin === 'false' ? false : undefined,
      sortFlaggedFirst: searchParams.sortFlaggedFirst === 'true' ? true : undefined,
    });

    // Build where clause using AND array to avoid OR key collisions
    const andConditions: Prisma.StoryWhereInput[] = [];

    if (isTranslation !== undefined) andConditions.push({ isTranslation });
    if (query) {
      andConditions.push({
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { author: {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          }},
          { category: { name: { contains: query, mode: 'insensitive' } } },
          { tags: { some: { tag: { name: { contains: query, mode: 'insensitive' } } } } },
        ],
      });
    }
    if (status) andConditions.push({ status });
    if (stage) andConditions.push({ stage });
    if (language) {
      // Match stories by language field OR language classification
      // (stories may have language set only via classification, not the language field)
      andConditions.push({
        OR: [
          { language },
          { classifications: { some: { classification: { type: 'LANGUAGE', name: { equals: language, mode: 'insensitive' } } } } },
        ],
      });
    }
    if (categoryId) andConditions.push({ categoryId });
    if (authorId) andConditions.push({ authorId });
    if (assignedToId) andConditions.push({ assignedToId });
    if (reviewerId) andConditions.push({ reviewerId });
    if (assignedReviewerId) andConditions.push({ assignedReviewerId });
    if (assignedApproverId) andConditions.push({ assignedApproverId });
    if (originalStoryId) andConditions.push({ originalStoryId });
    if (tagIds && tagIds.length > 0) {
      andConditions.push({ tags: { some: { tagId: { in: tagIds } } } });
    }
    if (flaggedForBulletin !== undefined) andConditions.push({ flaggedForBulletin });

    const where: Prisma.StoryWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    // Role-based filtering
    if (user.staffRole === 'INTERN') {
      // Interns can only see their own stories
      where.authorId = user.id;
    } else if (user.staffRole === 'JOURNALIST') {
      // Journalists can see their own stories and stories assigned to them
      // Combine role-based filtering with existing search conditions
      const roleFilter = {
        OR: [
          { authorId: user.id },
          { assignedToId: user.id },
          { reviewerId: user.id },
          { assignedReviewerId: user.id }
        ]
      };
      
      // If there's already a search query, combine it with role filtering
      if (query) {
        where.AND = [
          { OR: where.OR }, // Keep the search conditions
          roleFilter // Add role-based filtering
        ];
        delete where.OR; // Remove the original OR since it's now in AND
      } else {
        // No search query, just apply role filtering
        where.OR = roleFilter.OR;
      }
    }

    // Get total count
    const total = await prisma.story.count({ where });

    // Get paginated stories
    const stories = await prisma.story.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        publisher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedReviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedApprover: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        classifications: {
          include: {
            classification: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                color: true,
              },
            },
          },
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
        },
        storyGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        translations: {
          select: {
            id: true,
            title: true,
            language: true,
            stage: true,
            isTranslation: true,
            authorRole: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                audioClips: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            audioClips: true,
            translations: true,
          },
        },
      },
      orderBy: sortFlaggedFirst
        ? [{ flaggedForBulletin: 'desc' }, { updatedAt: 'desc' }]
        : { updatedAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    // Flatten audioClips from join-table format to flat AudioClip objects
    const transformedStories = stories.map((story: any) => ({
      ...story,
      audioClips: story.audioClips?.map((sac: any) => sac.audioClip) || [],
    }));

    return NextResponse.json({
      stories: transformedStories,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/stories - Create a new story
const createStory = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasStoryPermission(user.staffRole, 'create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    let storyData: Record<string, unknown> = {};
    const audioFiles: File[] = [];

    // Support both JSON and FormData
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      storyData = await req.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      // Fields that are JSON-encoded when sent via FormData
      const jsonFields = ['tagIds', 'classificationIds', 'libraryClipIds'];
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('audioFile_')) {
          audioFiles.push(value as File);
        } else if (key.startsWith('audioDescription_')) {
          // Audio descriptions collected but not currently used
        } else if (key !== 'audioFilesCount') {
          if (jsonFields.includes(key)) {
            try {
              storyData[key] = JSON.parse(value as string);
            } catch {
              storyData[key] = value as string;
            }
          } else {
            storyData[key] = value as string;
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
    }
    
    // Handle role-based validation
    let validatedData;
    const reviewerId = storyData.reviewerId;
    
    try {
      if (user.staffRole === 'INTERN' || user.staffRole === 'JOURNALIST') {
        // Interns and journalists can create stories without a category
        const storyFormData = {
          title: storyData.title,
          content: storyData.content,
          // categoryId: not required
          tagIds: [],
        };
        validatedData = storyCreateSchema.parse(storyFormData);
      } else {
        validatedData = storyCreateSchema.parse(storyData);
      }
    } catch (error) {
      throw error;
    }
    
    const { tagIds, ...cleanStoryData } = validatedData;

    // Process audio files
    const uploadedAudioFiles = [];

    try {
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];

        const validation = validateAudioFile(file);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const uploadedFile = await saveUploadedFile(file);
        
        uploadedAudioFiles.push({
          filename: uploadedFile.filename,
          originalName: uploadedFile.originalName,
          url: uploadedFile.url,
          fileSize: uploadedFile.size, // Note: database field is fileSize, not size
          mimeType: uploadedFile.mimeType,
          duration: uploadedFile.duration,
          uploadedBy: user.id,
        });
      }
    } catch (error) {
      throw error;
    }

    // Prepare create data
    let baseSlug = generateSlug(validatedData.title);

    // For translations, append language code to ensure unique slug
    if (storyData.isTranslation && storyData.language) {
      baseSlug = `${baseSlug}-${String(storyData.language).toLowerCase()}`;
    }

    // Generate unique slug with optimized single-query approach
    // Retry on slug conflict (TOCTOU race condition)
    let slug = await generateUniqueStorySlug(baseSlug);
    const MAX_SLUG_RETRIES = 3;

    const createData: Record<string, unknown> = {
      ...cleanStoryData,
      authorId: user.id,
      authorRole: user.staffRole, // Capture role at creation time
    };

    // If reviewer is provided, set stage to NEEDS_JOURNALIST_REVIEW
    if (reviewerId) {
      createData.assignedReviewerId = reviewerId;
      createData.stage = 'NEEDS_JOURNALIST_REVIEW';
    } else {
      // No reviewer, story starts as DRAFT
      createData.stage = 'DRAFT';
    }

    if (tagIds && tagIds.length > 0) {
      createData.tags = {
        create: tagIds.map((tagId: string) => ({
          tag: { connect: { id: tagId } }
        }))
      };
    }

    // Audio clips are handled after story creation (need the story ID for join table)

    try {
      // Retry on slug unique constraint violation (TOCTOU race)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let story: any;
      for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt++) {
        try {
          story = await prisma.story.create({
            data: { ...createData, slug } as any,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
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
                  fileSize: true,
                  mimeType: true,
                },
              },
            },
          },
        },
      });
          break; // Success — exit retry loop
        } catch (slugError) {
          if (isSlugConflictError(slugError) && attempt < MAX_SLUG_RETRIES) {
            slug = await generateUniqueStorySlug(baseSlug);
            continue;
          }
          throw slugError;
        }
      }

      if (!story) {
        throw new Error('Failed to create story after retries');
      }

      // Handle audio clips after story creation (need story ID for join table)
      if (uploadedAudioFiles.length > 0) {
        for (const audioFileData of uploadedAudioFiles) {
          await prisma.audioClip.create({
            data: {
              ...audioFileData,
              sourceStoryId: story.id,
              stories: {
                create: {
                  storyId: story.id,
                  addedBy: user.id,
                },
              },
            },
          });
        }
      }

      // Link library clips if provided
      const libraryClipIdsRaw = storyData.libraryClipIds;
      if (libraryClipIdsRaw) {
        try {
          const libraryClipIds: string[] = typeof libraryClipIdsRaw === 'string'
            ? JSON.parse(libraryClipIdsRaw)
            : libraryClipIdsRaw;

          if (Array.isArray(libraryClipIds) && libraryClipIds.length > 0) {
            // Verify clips exist
            const existingClips = await prisma.audioClip.findMany({
              where: { id: { in: libraryClipIds } },
              select: { id: true },
            });
            const validIds = existingClips.map(c => c.id);

            if (validIds.length > 0) {
              await prisma.storyAudioClip.createMany({
                data: validIds.map(audioClipId => ({
                  storyId: story.id,
                  audioClipId,
                  addedBy: user.id,
                })),
                skipDuplicates: true,
              });
            }
          }
        } catch (error) {
          console.error('Failed to link library clips:', error);
          // Non-fatal: story was created but clips weren't linked
        }
      }

      // Link audio clips from original story if this is a translation
      if (storyData.isTranslation && storyData.originalStoryId && uploadedAudioFiles.length === 0) {
        try {
          const originalAudioLinks = await prisma.storyAudioClip.findMany({
            where: { storyId: storyData.originalStoryId as string },
            select: { audioClipId: true },
          });

          if (originalAudioLinks.length > 0) {
            await prisma.storyAudioClip.createMany({
              data: originalAudioLinks.map(link => ({
                storyId: story.id,
                audioClipId: link.audioClipId,
                addedBy: user.id,
              })),
              skipDuplicates: true,
            });
          }
        } catch (error) {
          console.error('Failed to link audio clips from original story:', error);
        }
      }

      // Publish real-time event (non-blocking)
      publishStoryEvent(
        createEvent('story:created', 'story', story.id, user.id, undefined, {
          title: story.title,
        })
      ).catch(() => {});

      return NextResponse.json(story, { status: 201 });
    } catch (error) {
      // Clean up uploaded blob files if story creation fails
      if (uploadedAudioFiles.length > 0) {
        for (const audioFile of uploadedAudioFiles) {
          try {
            await deleteAudioFile(audioFile.url);
          } catch {
            // Best-effort cleanup — don't mask the original error
          }
        }
      }
      throw error;
    }
  },
  [
    withErrorHandling,
    withAuth,
    withAudit('story.create'),
  ]
);

export { getStories as GET, createStory as POST }; 