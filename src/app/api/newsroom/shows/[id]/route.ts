import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';
import { hasShowPermission, canEditShow, canDeleteShow } from '@/lib/permissions';
import { z } from 'zod';

const showUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  coverImage: z.string().nullable().optional(),
});

// GET /api/newsroom/shows/[id] - Get a single show
const getShow = createHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasShowPermission(user.staffRole as any, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const show = await prisma.show.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        episodes: {
          include: {
            audioClips: true,
            publisher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            episodeNumber: 'desc',
          },
        },
      },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    return NextResponse.json({ show });
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/shows/[id] - Update a show
const updateShow = createHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    const show = await prisma.show.findUnique({
      where: { id: params.id },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    if (!canEditShow(user.staffRole as any, show.createdById, user.id)) {
      return NextResponse.json({ error: 'Insufficient permissions to edit this show' }, { status: 403 });
    }

    const body = await req.json();
    const data = showUpdateSchema.parse(body);

    // If slug is being updated, check uniqueness
    if (data.slug && data.slug !== show.slug) {
      const existingShow = await prisma.show.findUnique({
        where: { slug: data.slug },
      });

      if (existingShow) {
        return NextResponse.json({ error: 'A show with this slug already exists' }, { status: 400 });
      }
    }

    // Update show
    const updatedShow = await prisma.show.update({
      where: { id: params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
        ...(data.tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: data.tagIds.map(tagId => ({
              tag: { connect: { id: tagId } },
            })),
          },
        }),
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ show: updatedShow });
  },
  [withErrorHandling, withAuth, withAudit('show.update')]
);

// DELETE /api/newsroom/shows/[id] - Delete a show
const deleteShow = createHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!canDeleteShow(user.staffRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const show = await prisma.show.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            episodes: true,
          },
        },
      },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await prisma.show.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Show deleted successfully' });
  },
  [withErrorHandling, withAuth, withAudit('show.delete')]
);

export const GET = getShow;
export const PATCH = updateShow;
export const DELETE = deleteShow;
