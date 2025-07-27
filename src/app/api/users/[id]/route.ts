import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { userUpdateSchema } from '@/lib/validations';

// GET /api/users/[id] - Get a single user
const getUser = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { radioStation: true },
    });

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return Response.json(user);
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/users/[id] - Update a user
const updateUser = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const data = (req as { validatedData: { email?: string; firstName?: string; lastName?: string; staffRole?: string } }).validatedData;

    // Check if email is being changed and if it's already taken
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id },
        },
      });

      if (existingUser) {
        return Response.json(
          { error: 'Email is already taken' },
          { status: 400 }
        );
      }
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data,
        include: { radioStation: true },
      });

      return Response.json(user);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        return Response.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      throw error;
    }
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(userUpdateSchema),
    withAudit('user.update'),
  ]
);

// DELETE /api/users/[id] - Delete a user
const deleteUser = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
      await prisma.user.delete({
        where: { id },
      });

      return new Response(null, { status: 204 });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        return Response.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      throw error;
    }
  },
  [withErrorHandling, withAuth, withAudit('user.delete')]
);

export { getUser as GET, updateUser as PATCH, deleteUser as DELETE }; 