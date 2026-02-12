import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { z } from 'zod';

function hasTagPermission(userRole: string | null, action: 'update' | 'delete') {
  if (!userRole) return false;
  const permissions: Record<string, string[]> = {
    INTERN: [],
    JOURNALIST: [],
    SUB_EDITOR: [],
    EDITOR: ['update', 'delete'],
    ADMIN: ['update', 'delete'],
    SUPERADMIN: ['update', 'delete'],
  };
  return permissions[userRole]?.includes(action) || false;
}

const tagUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  nameAfrikaans: z.string().optional(),
});

// GET /api/newsroom/tags/[id] - Get single tag
const getTag = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stories: true,
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ tag });
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/tags/[id] - Update tag
const updateTag = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasTagPermission(user.staffRole, 'update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const data = tagUpdateSchema.parse(body);

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({ where: { id } });
    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // If name is being updated, check uniqueness
    if (data.name && data.name !== existingTag.name) {
      const duplicate = await prisma.tag.findUnique({ where: { name: data.name } });
      if (duplicate) {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 400 });
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            stories: true,
          },
        },
      },
    });

    return NextResponse.json({ tag: updatedTag });
  },
  [withErrorHandling, withAuth, withAudit('tag.update')]
);

const deleteTag = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasTagPermission(user.staffRole, 'delete')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if tag exists
    const tag = await prisma.tag.findUnique({ where: { id }, include: { stories: true } });
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Prevent deletion if tag is in use by stories
    if (tag.stories.length > 0) {
      return NextResponse.json({ error: 'Cannot delete a tag that is in use by stories.' }, { status: 400 });
    }

    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  },
  [withErrorHandling, withAuth, withAudit('tag.delete')]
);

export { getTag as GET };
export { updateTag as PATCH };
export { deleteTag as DELETE }; 