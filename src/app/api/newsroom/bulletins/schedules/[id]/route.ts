import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateScheduleSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  language: z.enum(['ENGLISH', 'AFRIKAANS', 'XHOSA']).optional(),
  scheduleType: z.enum(['WEEKDAY', 'WEEKEND', 'PUBLIC_HOLIDAY']).optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/newsroom/bulletins/schedules/[id] - Update a bulletin schedule
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (EDITOR only)
    if (!session.user.staffRole || !['EDITOR', 'SUPERADMIN', 'ADMIN'].includes(session.user.staffRole)) {
      return NextResponse.json({ error: 'Only editors can update schedules' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateScheduleSchema.parse(body);

    // Check if schedule exists
    const existing = await prisma.bulletinSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // If changing time, language, or type, check for conflicts
    if (validatedData.time || validatedData.language || validatedData.scheduleType) {
      const checkData = {
        time: validatedData.time || existing.time,
        language: validatedData.language || existing.language,
        scheduleType: validatedData.scheduleType || existing.scheduleType,
      };

      const conflict = await prisma.bulletinSchedule.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { time: checkData.time },
            { language: checkData.language },
            { scheduleType: checkData.scheduleType },
          ],
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: 'A schedule already exists for this time, language, and schedule type' },
          { status: 400 }
        );
      }
    }

    const schedule = await prisma.bulletinSchedule.update({
      where: { id },
      data: validatedData,
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
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_BULLETIN_SCHEDULE',
        entityType: 'BULLETIN_SCHEDULE',
        entityId: schedule.id,
        metadata: {
          changes: validatedData,
        },
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating bulletin schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/newsroom/bulletins/schedules/[id] - Delete a bulletin schedule
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (EDITOR only)
    if (!session.user.staffRole || !['EDITOR', 'SUPERADMIN', 'ADMIN'].includes(session.user.staffRole)) {
      return NextResponse.json({ error: 'Only editors can delete schedules' }, { status: 403 });
    }

    // Check if schedule exists
    const schedule = await prisma.bulletinSchedule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bulletins: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Prevent deletion if there are associated bulletins
    if (schedule._count.bulletins > 0) {
      return NextResponse.json(
        { error: 'Cannot delete schedule with associated bulletins' },
        { status: 400 }
      );
    }

    await prisma.bulletinSchedule.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_BULLETIN_SCHEDULE',
        entityType: 'BULLETIN_SCHEDULE',
        entityId: id,
        metadata: {
          title: schedule.title,
          time: schedule.time,
          language: schedule.language,
          scheduleType: schedule.scheduleType,
        },
      },
    });

    return NextResponse.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting bulletin schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}