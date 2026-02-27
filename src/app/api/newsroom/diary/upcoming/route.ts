import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';

// GET /api/newsroom/diary/upcoming - Lightweight endpoint for dashboard widget
const getUpcomingDiaryEntries = createHandler(
  async (req: NextRequest) => {
    const user = (req as NextRequest & { user: { id: string; userType: string } }).user;

    if (user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Staff only' }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const sevenDaysFromNow = new Date(startOfToday);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const entries = await prisma.diaryEntry.findMany({
      where: {
        isCompleted: false,
        dateTime: {
          lte: sevenDaysFromNow,
        },
      },
      orderBy: { dateTime: 'asc' },
      take: 20,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        story: {
          select: { id: true, title: true },
        },
      },
    });

    const formatted = entries.map(entry => {
      const daysUntil = Math.ceil((entry.dateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...entry,
        daysUntil,
        isOverdue: entry.dateTime < startOfToday,
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
      total: formatted.length,
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

export { getUpcomingDiaryEntries as GET };
