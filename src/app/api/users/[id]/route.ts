import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { userSchema } from '@/lib/validations';

// GET /api/users/[id] - Get a single user
const getUser = createHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { station: true },
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
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const data = (req as any).validatedData;

    // Check if email is being changed and if it's already taken
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: params.id },
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
        where: { id: params.id },
        data,
        include: { station: true },
      });

      return Response.json(user);
    } catch (error) {
      if (error.code === 'P2025') {
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
    withValidation(userSchema.partial()),
    withAudit('user.update'),
  ]
);

// DELETE /api/users/[id] - Delete a user
const deleteUser = createHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      await prisma.user.delete({
        where: { id: params.id },
      });

      return new Response(null, { status: 204 });
    } catch (error) {
      if (error.code === 'P2025') {
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