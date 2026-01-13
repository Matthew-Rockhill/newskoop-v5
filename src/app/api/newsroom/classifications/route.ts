import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { classificationCreateSchema } from '@/lib/validations';
import { ClassificationType } from '@prisma/client';
import { generateSlug, generateUniqueClassificationSlug } from '@/lib/slug-utils';

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

// GET /api/newsroom/classifications - List classifications
const getClassifications = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;

    if (!hasClassificationPermission(user.staffRole, 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    const type = url.searchParams.get('type') as ClassificationType | null;
    const isActive = url.searchParams.get('isActive');

    const where: {
      OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; slug?: { contains: string; mode: 'insensitive' } }>;
      type?: ClassificationType;
      isActive?: boolean;
    } = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' as const } },
        { slug: { contains: query, mode: 'insensitive' as const } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const classifications = await prisma.classification.findMany({
      where,
      include: {
        _count: {
          select: {
            stories: true,
            shows: true,
            allowedByStations: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ classifications });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/classifications - Create a new classification
const createClassification = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; staffRole: string | null } }).user;
    const data = (req as NextRequest & { validatedData: {
      name: string;
      nameAfrikaans?: string;
      descriptionAfrikaans?: string;
      type: ClassificationType;
      color?: string;
      isActive?: boolean;
      sortOrder?: number;
    } }).validatedData;

    if (!hasClassificationPermission(user.staffRole, 'create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check for duplicate name within the same type
    const existing = await prisma.classification.findFirst({
      where: {
        name: data.name,
        type: data.type,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A ${data.type.toLowerCase()} classification with this name already exists` },
        { status: 400 }
      );
    }

    // Generate unique slug with optimized single-query approach
    const baseSlug = generateSlug(data.name);
    const slug = await generateUniqueClassificationSlug(baseSlug);

    const classification = await prisma.classification.create({
      data: {
        name: data.name,
        slug,
        nameAfrikaans: data.nameAfrikaans,
        descriptionAfrikaans: data.descriptionAfrikaans,
        type: data.type,
        color: data.color,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
      include: {
        _count: {
          select: {
            stories: true,
            shows: true,
            allowedByStations: true,
          },
        },
      },
    });

    return NextResponse.json(classification, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(classificationCreateSchema),
    withAudit('classification.create'),
  ]
);

export { getClassifications as GET, createClassification as POST };
