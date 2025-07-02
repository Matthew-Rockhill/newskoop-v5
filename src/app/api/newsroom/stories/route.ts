import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { storyCreateSchema, storySearchSchema } from '@/lib/validations';
import { Prisma, StoryStatus } from '@prisma/client';
import { saveUploadedFile, validateAudioFile } from '@/lib/file-upload';

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
    const user = (req as any).user;
    
    if (!hasStoryPermission(user.staffRole, 'read')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams);
    
    const {
      query,
      status,
      priority,
      language,
      categoryId,
      authorId,
      assignedToId,
      reviewerId,
      religiousFilter,
      tagIds,
      page = 1,
      perPage = 10
    } = storySearchSchema.parse({
      ...searchParams,
      page: searchParams.page ? Number(searchParams.page) : 1,
      perPage: searchParams.perPage ? Number(searchParams.perPage) : 10,
      tagIds: searchParams.tagIds ? searchParams.tagIds.split(',') : undefined,
    });

    // Build where clause
    const where: Prisma.StoryWhereInput = {
      ...(query && {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(language && { language }),
      ...(categoryId && { categoryId }),
      ...(authorId && { authorId }),
      ...(assignedToId && { assignedToId }),
      ...(reviewerId && { reviewerId }),
      ...(religiousFilter && { religiousFilter }),
      ...(tagIds && tagIds.length > 0 && {
        tags: {
          some: {
            tagId: { in: tagIds }
          }
        }
      }),
    };

    // Role-based filtering
    if (user.staffRole === 'INTERN') {
      // Interns can only see their own stories
      where.authorId = user.id;
    } else if (user.staffRole === 'JOURNALIST') {
      // Journalists can see their own stories and stories assigned to them
      where.OR = [
        { authorId: user.id },
        { assignedToId: user.id },
        { reviewerId: user.id }
      ];
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
            description: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return Response.json({
      stories,
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
    const user = (req as any).user;

    if (!hasStoryPermission(user.staffRole, 'create')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    let storyData: any = {};
    let tagIds: string[] = [];
    const uploadedAudioFiles: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await req.formData();
      
      // Extract story data from FormData
      const audioFiles: File[] = [];
      const audioDescriptions: string[] = [];
      
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('audioFile_')) {
          audioFiles.push(value as File);
        } else if (key.startsWith('audioDescription_')) {
          const index = parseInt(key.split('_')[1]);
          audioDescriptions[index] = value as string;
        } else if (key !== 'audioFilesCount') {
          if (key === 'tagIds') {
            tagIds = JSON.parse(value as string);
          } else {
            storyData[key] = value as string;
          }
        }
      }

      // Process audio files
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const description = audioDescriptions[i] || '';
        
        // Validate audio file
        const validation = validateAudioFile(file);
        if (!validation.valid) {
          return Response.json({ error: validation.error }, { status: 400 });
        }
        
        // Save file and get file info
        const uploadedFile = await saveUploadedFile(file);
        uploadedAudioFiles.push({
          filename: uploadedFile.filename,
          originalName: uploadedFile.originalName,
          url: uploadedFile.url,
          fileSize: uploadedFile.size, // Note: database field is fileSize, not size
          mimeType: uploadedFile.mimeType,
          description,
          uploadedBy: user.id,
        });
      }
    } else {
      // Handle JSON data (no file uploads)
      const body = await req.json();
      const { tagIds: bodyTagIds, ...restData } = body;
      storyData = restData;
      tagIds = bodyTagIds || [];
    }

    // Validate story data
    const validatedData = storyCreateSchema.parse(storyData);
    const { tagIds: validatedTagIds, ...cleanStoryData } = validatedData;
    
    // Use tagIds from validation if present, otherwise use extracted tagIds
    const finalTagIds = validatedTagIds || tagIds;

    // Create story with audio files
    const story = await prisma.story.create({
      data: {
        ...cleanStoryData,
        authorId: user.id,
        slug: generateSlug(validatedData.title),
        // Connect tags if provided
        ...(finalTagIds && finalTagIds.length > 0 && {
          tags: {
            create: finalTagIds.map((tagId: string) => ({
              tag: { connect: { id: tagId } }
            }))
          }
        }),
        // Create audio clips
        ...(uploadedAudioFiles.length > 0 && {
          audioClips: {
            create: uploadedAudioFiles
          }
        })
      },
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
            fileSize: true,
            mimeType: true,
            description: true,
          },
        },
      },
    });

    return Response.json(story, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withAudit('story.create'),
  ]
);

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export { getStories as GET, createStory as POST }; 