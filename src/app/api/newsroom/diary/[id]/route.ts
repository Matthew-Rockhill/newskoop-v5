import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { z } from 'zod';

const SUB_EDITOR_PLUS = ['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'];

const updateDiaryEntrySchema = z.object({
  title: z.string().min(1).optional(),
  dateTime: z.string().optional(),
  notes: z.string().optional().nullable(),
  storyId: z.string().optional().nullable(),
});

// GET /api/newsroom/diary/[id]
const getDiaryEntry = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; userType: string } }).user;

    if (user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Staff only' }, { status: 403 });
    }

    const entry = await prisma.diaryEntry.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, staffRole: true },
        },
        story: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Diary entry not found' }, { status: 404 });
    }

    return NextResponse.json({ entry });
  },
  [withErrorHandling, withAuth]
);

// PUT /api/newsroom/diary/[id] - Update diary entry
const updateDiaryEntry = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; userType: string; staffRole: string | null } }).user;

    if (user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Staff only' }, { status: 403 });
    }

    const entry = await prisma.diaryEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: 'Diary entry not found' }, { status: 404 });
    }

    // Only creator or SUB_EDITOR+ can edit
    const isCreator = entry.createdById === user.id;
    const isSubEditorPlus = user.staffRole && SUB_EDITOR_PLUS.includes(user.staffRole);
    if (!isCreator && !isSubEditorPlus) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const data = updateDiaryEntrySchema.parse(body);

    if (data.storyId) {
      const story = await prisma.story.findUnique({ where: { id: data.storyId } });
      if (!story) {
        return NextResponse.json({ error: 'Story not found' }, { status: 404 });
      }
    }

    const updated = await prisma.diaryEntry.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.dateTime !== undefined && { dateTime: new Date(data.dateTime) }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.storyId !== undefined && { storyId: data.storyId }),
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, staffRole: true },
        },
        story: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return NextResponse.json({ entry: updated });
  },
  [withErrorHandling, withAuth]
);

// PATCH /api/newsroom/diary/[id] - Toggle completion
const toggleDiaryEntry = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; userType: string } }).user;

    if (user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Staff only' }, { status: 403 });
    }

    const entry = await prisma.diaryEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: 'Diary entry not found' }, { status: 404 });
    }

    const nowCompleted = !entry.isCompleted;

    const updated = await prisma.diaryEntry.update({
      where: { id },
      data: {
        isCompleted: nowCompleted,
        completedAt: nowCompleted ? new Date() : null,
        completedById: nowCompleted ? user.id : null,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, staffRole: true },
        },
        story: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return NextResponse.json({
      entry: updated,
      message: nowCompleted ? 'Diary entry marked as completed' : 'Diary entry marked as incomplete',
    });
  },
  [withErrorHandling, withAuth]
);

// DELETE /api/newsroom/diary/[id]
const deleteDiaryEntry = createHandler(
  async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const { id } = await params;
    const user = (req as NextRequest & { user: { id: string; userType: string; staffRole: string | null } }).user;

    if (user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Staff only' }, { status: 403 });
    }

    const entry = await prisma.diaryEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: 'Diary entry not found' }, { status: 404 });
    }

    // Only creator or SUB_EDITOR+ can delete
    const isCreator = entry.createdById === user.id;
    const isSubEditorPlus = user.staffRole && SUB_EDITOR_PLUS.includes(user.staffRole);
    if (!isCreator && !isSubEditorPlus) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await prisma.diaryEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  },
  [withErrorHandling, withAuth]
);

export { getDiaryEntry as GET };
export { updateDiaryEntry as PUT };
export { toggleDiaryEntry as PATCH };
export { deleteDiaryEntry as DELETE };
