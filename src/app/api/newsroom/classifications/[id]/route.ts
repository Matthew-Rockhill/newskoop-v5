import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { classificationUpdateSchema } from '@/lib/validations';

// Helper function to check permissions
function hasClassificationPermission(userRole: string | null, action: 'create' | 'read' | 'update' | 'delete') {
  if (!userRole) {
    return false;
  }

  const permissions: Record<string, string[]> = {
    INTERN: ['read'],
    JOURNALIST: ['read'],
    SUB_EDITOR: ['read'],
    EDITOR: ['create', 'read', 'update', 'delete'],
    ADMIN: ['create', 'read', 'update', 'delete'],
    SUPERADMIN: ['create', 'read', 'update', 'delete'],
  };

  return permissions[userRole]?.includes(action) || false;
}

// GET /api/newsroom/classifications/[id] - Get a single classification
const getClassification = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const { id } = await params;

    if (!hasClassificationPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const classification = await prisma.classification.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stories: true,
            allowedByStations: true,
          },
        },
      },
    });

    if (!classification) {
      return NextResponse.json({ error: 'Classification not found' }, { status: 404 });
    }

    return NextResponse.json(classification);
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/classifications/[id] - Update a classification
const updateClassification = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const { id } = await params;
    const data = (req as NextRequest & { validatedData: {
      name?: string;
      nameAfrikaans?: string;
      descriptionAfrikaans?: string;
      isActive?: boolean;
      sortOrder?: number;
    } }).validatedData;

    if (!hasClassificationPermission(user.staffRole, 'update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if classification exists
    const existing = await prisma.classification.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Classification not found' }, { status: 404 });
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.classification.findFirst({
        where: {
          name: data.name,
          type: existing.type,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `A ${existing.type.toLowerCase()} classification with this name already exists` },
          { status: 400 }
        );
      }
    }

    const classification = await prisma.classification.update({
      where: { id },
      data: {
        name: data.name,
        nameAfrikaans: data.nameAfrikaans,
        descriptionAfrikaans: data.descriptionAfrikaans,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
      include: {
        _count: {
          select: {
            stories: true,
            allowedByStations: true,
          },
        },
      },
    });

    return NextResponse.json(classification);
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(classificationUpdateSchema),
    withAudit('classification.update'),
  ]
);

// DELETE /api/newsroom/classifications/[id] - Delete a classification
const deleteClassification = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const { id } = await params;

    if (!hasClassificationPermission(user.staffRole, 'delete')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if classification exists
    const existing = await prisma.classification.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stories: true,
            allowedByStations: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Classification not found' }, { status: 404 });
    }

    // Check if classification is in use
    const totalUsage = existing._count.stories + existing._count.allowedByStations;
    if (totalUsage > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete classification that is in use',
          usage: {
            stories: existing._count.stories,
            stations: existing._count.allowedByStations,
          }
        },
        { status: 400 }
      );
    }

    await prisma.classification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  },
  [
    withErrorHandling,
    withAuth,
    withAudit('classification.delete'),
  ]
);

export { getClassification as GET, updateClassification as PATCH, deleteClassification as DELETE };
