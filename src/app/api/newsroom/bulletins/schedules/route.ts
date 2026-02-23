import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createScheduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  language: z.enum(['ENGLISH', 'AFRIKAANS', 'XHOSA']),
  scheduleType: z.enum(['WEEKDAY', 'WEEKEND', 'PUBLIC_HOLIDAY']),
  isActive: z.boolean().optional(),
});

// GET /api/newsroom/bulletins/schedules - Get all bulletin schedules
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (EDITOR or SUB_EDITOR)
    if (!session.user.staffRole || !['EDITOR', 'SUB_EDITOR', 'SUPERADMIN', 'ADMIN'].includes(session.user.staffRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const scheduleType = url.searchParams.get('type');
    const isActive = url.searchParams.get('active');

    const where: any = {};
    if (scheduleType) {
      where.scheduleType = scheduleType;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const schedules = await prisma.bulletinSchedule.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            bulletins: true,
          },
        },
      },
      orderBy: [
        { scheduleType: 'asc' },
        { time: 'asc' },
        { language: 'asc' },
      ],
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching bulletin schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/newsroom/bulletins/schedules - Create a new bulletin schedule
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (EDITOR only)
    if (!session.user.staffRole || !['EDITOR', 'SUPERADMIN', 'ADMIN'].includes(session.user.staffRole)) {
      return NextResponse.json({ error: 'Only editors can create schedules' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createScheduleSchema.parse(body);

    const schedule = await prisma.bulletinSchedule.create({
      data: {
        ...validatedData,
        createdBy: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_BULLETIN_SCHEDULE',
        entityType: 'BULLETIN_SCHEDULE',
        entityId: schedule.id,
        metadata: {
          title: schedule.title,
          time: schedule.time,
          language: schedule.language,
          scheduleType: schedule.scheduleType,
        },
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating bulletin schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}