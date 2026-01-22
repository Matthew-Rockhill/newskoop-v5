import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { storyUpdateSchema } from '@/lib/validations';
import { deleteAudioFile } from '@/lib/r2-storage';
import { saveUploadedFile, validateAudioFile } from '@/lib/file-upload';
import { generateSlug, generateUniqueStorySlug } from '@/lib/slug-utils';

// Helper function to check permissions
function hasStoryPermission(userRole: string | null, action: 'create' | 'read' | 'update' | 'delete') {
  // If no staff role, deny access to newsroom features
  if (!userRole) {
    return false;
  }
  
  const permissions = {
    INTERN: ['create', 'read', 'update'],
    JOURNALIST: ['create', 'read', 'update'],
    SUB_EDITOR: ['create', 'read', 'update'],
    EDITOR: ['create', 'read', 'update', 'delete'],
    ADMIN: ['create', 'read', 'update', 'delete'],
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
  };
  
  return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
}

// Helper function to check if user can edit specific story
async function canEditStory(userId: string, userRole: string | null, storyId: string) {
  if (!userRole) return false;
  if (!hasStoryPermission(userRole, 'update')) {
    return false;
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: {
      authorId: true,
      stage: true,
      assignedReviewerId: true,
      assignedApproverId: true,
      isTranslation: true,
    },
  });

  if (!story) return false;

  // Use stage-based permission checking
  const { canEditStoryByStage } = await import('@/lib/permissions');
  return canEditStoryByStage(
    userRole as any,
    story.stage,
    story.authorId,
    userId,
    story.assignedReviewerId,
    story.assignedApproverId,
    story.isTranslation
  );
}

// GET /api/newsroom/stories/[id] - Get a single story
const getStory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasStoryPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        status: true,
        stage: true,
        assignedReviewerId: true,
        assignedApproverId: true,
        language: true,
        isTranslation: true,
        originalStoryId: true,
        storyGroupId: true,
        authorId: true,
        assignedToId: true,
        reviewerId: true,
        publishedAt: true,
        publishedBy: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
        followUpDate: true,
        followUpNote: true,
        reviewChecklist: true,
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
            staffRole: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
        publisher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
        assignedReviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
        assignedApprover: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            staffRole: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
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
            filename: true,
            originalName: true,
            url: true,
            duration: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
          },
        },
        comments: {
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
            resolver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            replies: {
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
              },
            },
          },
          orderBy: { createdAt: 'desc' },
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
      },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Role-based access control
    if (user.staffRole === 'INTERN' && story.authorId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (user.staffRole === 'JOURNALIST') {
      // Check if journalist has direct access
      const hasDirectAccess = story.authorId === user.id ||
                              story.assignedToId === user.id ||
                              story.reviewerId === user.id ||
                              story.assignedReviewerId === user.id ||
                              story.assignedApproverId === user.id;

      // Check if this is an original story of a translation they're working on
      let hasTranslationAccess = false;
      if (!hasDirectAccess) {
        const translationByUser = await prisma.story.findFirst({
          where: {
            authorId: user.id,
            originalStoryId: story.id,
            isTranslation: true,
          },
          select: { id: true },
        });
        hasTranslationAccess = !!translationByUser;
      }

      if (!hasDirectAccess && !hasTranslationAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Alias translationRequests as translations for frontend compatibility
    return NextResponse.json(story);
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/stories/[id] - Update a story
const updateStory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    let rawData: Record<string, unknown> = {};
    const audioFiles: File[] = [];

    // Support both JSON and FormData
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Handle JSON body (no file uploads)
      const body = await req.json();

      // Validate the data
      try {
        rawData = body;
      } catch (error) {
        console.error('Validation failed:', error);
        throw error;
      }
    } else if (contentType.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await req.formData();

      for (const [key, value] of formData.entries()) {
        if (key.startsWith('audioFile_')) {
          audioFiles.push(value as File);
        } else if (key === 'removedAudioIds') {
          rawData[key] = JSON.parse(value as string);
        } else if (key === 'tagIds') {
          rawData[key] = JSON.parse(value as string);
        } else if (key === 'classificationIds') {
          rawData[key] = JSON.parse(value as string);
        } else if (key !== 'audioFilesCount') {
          rawData[key] = value as string;
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
    }

    // Validate the data
    let data: {
      title?: string;
      content?: string;
      categoryId?: string;
      tagIds?: string[];
      classificationIds?: string[];
      removedAudioIds?: string[];
      status?: string;
      slug?: string;
    };

    try {
      data = storyUpdateSchema.parse(rawData);
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    }

    // Check if this is only a categorisation update (categoryId, tagIds, and/or classificationIds)
    const isCategorisationOnly =
      (data.categoryId !== undefined || data.tagIds !== undefined || data.classificationIds !== undefined) &&
      !data.title && !data.content;

    // Sub-editors and above can always update categorisation
    const canUpdateCategorisation =
      user.staffRole && ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user.staffRole);

    // Check permissions
    if (isCategorisationOnly && canUpdateCategorisation) {
      // Allow categorisation updates for sub-editors and above
    } else {
      // For other updates, check standard edit permissions
      const canEdit = await canEditStory(user.id, user.staffRole, id);
      if (!canEdit) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // When updating to APPROVED or READY_TO_PUBLISH, require categoryId
    if ((data.status === 'APPROVED' || data.status === 'READY_TO_PUBLISH') && !data.categoryId) {
      return NextResponse.json({ error: 'Category is required to approve or publish a story.' }, { status: 400 });
    }

    // Handle audio clip deletions
    if (data.removedAudioIds && data.removedAudioIds.length > 0) {
      // Fetch audio clips to get their URLs
      const audioClips = await prisma.audioClip.findMany({
        where: {
          id: { in: data.removedAudioIds },
          storyId: id // Verify they belong to this story
        },
        select: { id: true, url: true },
      });

      // Delete files from storage
      for (const audioClip of audioClips) {
        try {
          await deleteAudioFile(audioClip.url);
        } catch (error) {
          console.error(`Failed to delete audio file ${audioClip.url}:`, error);
          // Continue with deletion even if some files fail
        }
      }

      // Delete audio clip records from database
      await prisma.audioClip.deleteMany({
        where: {
          id: { in: data.removedAudioIds },
          storyId: id // Verify they belong to this story
        },
      });
    }

    // Process new audio file uploads
    const uploadedAudioFiles = [];
    if (audioFiles.length > 0) {
      try {
        for (let i = 0; i < audioFiles.length; i++) {
          const file = audioFiles[i];

          // Validate audio file
          const validation = validateAudioFile(file);
          if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
          }

          // Save file and get file info
          const uploadedFile = await saveUploadedFile(file);

          uploadedAudioFiles.push({
            filename: uploadedFile.filename,
            originalName: uploadedFile.originalName,
            url: uploadedFile.url,
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.mimeType,
            uploadedBy: user.id,
          });
        }
      } catch (error) {
        console.error('Error processing audio files:', error);
        throw error;
      }
    }

    // Extract tag IDs, classification IDs, and removedAudioIds from the data
    const { tagIds, classificationIds, removedAudioIds, ...storyData } = data;

    // Generate new slug if title is being updated
    if (storyData.title) {
      // Fetch story to check if it's a translation
      const existingStory = await prisma.story.findUnique({
        where: { id },
        select: { isTranslation: true, language: true, slug: true }
      });

      let baseSlug = generateSlug(storyData.title);

      // For translations, append language code to ensure unique slug
      if (existingStory?.isTranslation && existingStory?.language) {
        baseSlug = `${baseSlug}-${existingStory.language.toLowerCase()}`;
      }

      // Check if the new slug is different from the current one
      // If it's the same, don't update it to avoid unique constraint errors
      if (existingStory?.slug === baseSlug) {
        delete storyData.slug;
      } else {
        // Generate unique slug with optimized single-query approach
        const slug = await generateUniqueStorySlug(baseSlug, id);
        storyData.slug = slug;
      }
    }

    const updateData: Record<string, unknown> = { ...storyData };

    if (tagIds !== undefined) {
      updateData.tags = {
        deleteMany: {}, // Remove all existing tags
        create: tagIds.map((tagId: string) => ({
          tag: { connect: { id: tagId } }
        }))
      };
    }

    if (classificationIds !== undefined) {
      updateData.classifications = {
        deleteMany: {}, // Remove all existing classifications
        create: classificationIds.map((classificationId: string) => ({
          classification: { connect: { id: classificationId } }
        }))
      };
    }

    // Add new audio clips if any were uploaded
    if (uploadedAudioFiles.length > 0) {
      updateData.audioClips = {
        create: uploadedAudioFiles
      };
    }

    const story = await prisma.story.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
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
            filename: true,
            originalName: true,
            url: true,
            duration: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(story);
  },
  [
    withErrorHandling,
    withAuth,
    withAudit('story.update'),
  ]
);

// DELETE /api/newsroom/stories/[id] - Delete a story
const deleteStory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    // Check if story exists and get its stage, authorId, and audio clips
    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        status: true,
        stage: true,
        authorId: true,
        audioClips: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Use stage-based permission check
    const { canDeleteStoryByStage } = await import('@/lib/permissions');
    if (!canDeleteStoryByStage(user.staffRole as any, story.stage, story.authorId, user.id)) {
      return NextResponse.json({ error: 'Insufficient permissions to delete this story' }, { status: 403 });
    }

    // Delete audio files from storage before deleting story
    for (const audioClip of story.audioClips) {
      try {
        await deleteAudioFile(audioClip.url);
      } catch (error) {
        console.error(`Failed to delete audio file ${audioClip.url}:`, error);
        // Continue with deletion even if some files fail
      }
    }

    await prisma.story.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Story deleted successfully' });
  },
  [withErrorHandling, withAuth, withAudit('story.delete')]
);

export { getStory as GET, updateStory as PATCH, deleteStory as DELETE }; 