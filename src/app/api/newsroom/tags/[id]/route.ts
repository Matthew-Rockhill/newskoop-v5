import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withAudit } from '@/lib/api-handler';

function hasTagPermission(userRole: string | null, action: 'delete') {
  if (!userRole) return false;
  const permissions: Record<string, string[]> = {
    INTERN: [],
    JOURNALIST: [],
    SUB_EDITOR: [],
    EDITOR: ['delete'],
    ADMIN: ['delete'],
    SUPERADMIN: ['delete'],
  };
  return permissions[userRole]?.includes(action) || false;
}

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

    // Prevent deletion if tag is in use and is LANGUAGE or RELIGION
    if ((tag.category === 'LANGUAGE' || tag.category === 'RELIGION') && tag.stories.length > 0) {
      return NextResponse.json({ error: 'Cannot delete a language or religion tag that is in use by stories.' }, { status: 400 });
    }

    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  },
  [withErrorHandling, withAuth, withAudit('tag.delete')]
);

export { deleteTag as DELETE }; 