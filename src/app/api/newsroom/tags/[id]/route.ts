import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';

function hasTagPermission(userRole: string | null, action: 'delete') {
  if (!userRole) return false;
  const permissions = {
    INTERN: [],
    JOURNALIST: [],
    SUB_EDITOR: [],
    EDITOR: ['delete'],
    ADMIN: ['delete'],
    SUPERADMIN: ['delete'],
  };
  return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
}

const deleteTag = createHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = (req as any).user;

    if (!hasTagPermission(user.staffRole, 'delete')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if tag exists
    const tag = await prisma.tag.findUnique({ where: { id }, include: { stories: true } });
    if (!tag) {
      return Response.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Prevent deletion if tag is in use and is LANGUAGE or RELIGION
    if ((tag.category === 'LANGUAGE' || tag.category === 'RELIGION') && tag.stories.length > 0) {
      return Response.json({ error: 'Cannot delete a language or religion tag that is in use by stories.' }, { status: 400 });
    }

    await prisma.tag.delete({ where: { id } });
    return Response.json({ success: true });
  },
  [withErrorHandling, withAuth, withAudit('tag.delete')]
);

export { deleteTag as DELETE }; 