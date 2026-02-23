import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';
import { z } from 'zod';

const createDiaryEntrySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dateTime: z.string().min(1, 'Date/time is required'),
  notes: z.string().optional(),
  storyId: z.string().optional(),
});

// GET /api/newsroom/diary - List diary entries with pagination
const listDiaryEntries = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; userType: string; staffRole: string | null } }).user;

    if (user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Staff only' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    const where: Record<string, unknown> = {};

    if (!includeCompleted) {
      where.isCompleted = false;
    }

    if (from || to) {
      where.dateTime = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [entries, total] = await Promise.all([
      prisma.diaryEntry.findMany({
        where,
        orderBy: { dateTime: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, staffRole: true },
          },
          story: {
            select: { id: true, title: true, status: true },
          },
        },
      }),
      prisma.diaryEntry.count({ where }),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const sevenDaysFromNow = new Date(startOfToday);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const formatted = entries.map(entry => {
      const daysUntil = Math.ceil((entry.dateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...entry,
        daysUntil,
        isOverdue: entry.dateTime < startOfToday && !entry.isCompleted,
        isDueToday: entry.dateTime >= startOfToday && entry.dateTime < endOfToday,
        isDueSoon: entry.dateTime >= endOfToday && entry.dateTime < sevenDaysFromNow,
      };
    });

    const grouped = {
      overdue: formatted.filter(e => e.isOverdue),
      dueToday: formatted.filter(e => e.isDueToday),
      dueSoon: formatted.filter(e => e.isDueSoon),
      upcoming: formatted.filter(e => !e.isOverdue && !e.isDueToday && !e.isDueSoon),
    };

    return NextResponse.json({
      entries: formatted,
      grouped,
      total,
      pagination: {
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
      counts: {
        overdue: grouped.overdue.length,
        dueToday: grouped.dueToday.length,
        dueSoon: grouped.dueSoon.length,
        upcoming: grouped.upcoming.length,
      },
    });
  },
  [withErrorHandling, withAuth]
);

// POST /api/newsroom/diary - Create diary entry
const createDiaryEntry = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; userType: string; staffRole: string | null } }).user;

    if (user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Staff only' }, { status: 403 });
    }

    const body = await req.json();
    const data = createDiaryEntrySchema.parse(body);

    if (data.storyId) {
      const story = await prisma.story.findUnique({ where: { id: data.storyId } });
      if (!story) {
        return NextResponse.json({ error: 'Story not found' }, { status: 404 });
      }
    }

    const entry = await prisma.diaryEntry.create({
      data: {
        title: data.title,
        dateTime: new Date(data.dateTime),
        notes: data.notes || null,
        storyId: data.storyId || null,
        createdById: user.id,
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

    return NextResponse.json({ entry }, { status: 201 });
  },
  [withErrorHandling, withAuth]
);

export { listDiaryEntries as GET };
export { createDiaryEntry as POST };
