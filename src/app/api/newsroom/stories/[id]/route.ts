import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { storyUpdateSchema } from '@/lib/validations';

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
async function canEditStory(userId: string, userRole: string, storyId: string) {
  if (!hasStoryPermission(userRole, 'update')) {
    return false;
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true, assignedToId: true, reviewerId: true, status: true },
  });

  if (!story) return false;

  // Editors and above can edit any story
  if (['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
    return true;
  }

  // Authors can edit their own stories if not published
  if (story.authorId === userId && story.status !== 'PUBLISHED') {
    return true;
  }

  // Assigned users can edit stories assigned to them
  if (story.assignedToId === userId || story.reviewerId === userId) {
    return true;
  }

  return false;
}

// GET /api/newsroom/stories/[id] - Get a single story
const getStory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as { user: { id: string; staffRole: string | null } }).user;

    if (!hasStoryPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const story = await prisma.story.findUnique({
      where: { id },
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
        audioClips: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            duration: true,
            fileSize: true,
            mimeType: true,
            description: true,
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
      const hasAccess = story.authorId === user.id || 
                       story.assignedToId === user.id || 
                       story.reviewerId === user.id;
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json(story);
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/stories/[id] - Update a story
const updateStory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as { user: { id: string; staffRole: string | null } }).user;
    const data = (req as { validatedData: { 
      status?: string; 
      categoryId?: string; 
      tagIds?: string[]; 
      title?: string;
      content?: string;
      priority?: string;
      assignedToId?: string;
      reviewerId?: string;
      [key: string]: unknown;
    } }).validatedData;

    const canEdit = await canEditStory(user.id, user.staffRole, id);
    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // When updating to APPROVED or READY_TO_PUBLISH, require categoryId
    if ((data.status === 'APPROVED' || data.status === 'READY_TO_PUBLISH') && !data.categoryId) {
      return NextResponse.json({ error: 'Category is required to approve or publish a story.' }, { status: 400 });
    }

    // Extract tag IDs from the data
    const { tagIds, ...storyData } = data;

    // Generate new slug if title is being updated
    if (storyData.title) {
      storyData.slug = generateSlug(storyData.title);
    }

    const story = await prisma.story.update({
      where: { id },
      data: {
        ...storyData,
        // Handle tags update if provided
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {}, // Remove all existing tags
            create: tagIds.map((tagId: string) => ({
              tag: { connect: { id: tagId } }
            }))
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
      },
    });

    return NextResponse.json(story);
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(storyUpdateSchema),
    withAudit('story.update'),
  ]
);

// DELETE /api/newsroom/stories/[id] - Delete a story
const deleteStory = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as { user: { id: string; staffRole: string | null } }).user;

    if (!hasStoryPermission(user.staffRole, 'delete')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if story exists and get its status
    const story = await prisma.story.findUnique({
      where: { id },
      select: { status: true, authorId: true },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Don't allow deletion of published stories unless you're an admin
    if (story.status === 'PUBLISHED' && !['ADMIN', 'SUPERADMIN'].includes(user.staffRole)) {
      return NextResponse.json({ error: 'Cannot delete published stories' }, { status: 400 });
    }

    await prisma.story.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Story deleted successfully' });
  },
  [withErrorHandling, withAuth, withAudit('story.delete')]
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

export { getStory as GET, updateStory as PATCH, deleteStory as DELETE }; 