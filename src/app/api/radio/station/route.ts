import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateStationSchema = z.object({
  name: z.string().min(1, 'Station name is required').optional(),
  description: z.string().optional(),
  contactNumber: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow radio users to access this endpoint
    if (session.user.userType !== 'RADIO') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user is the primary contact for the station
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { radioStation: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isPrimaryContact) {
      return NextResponse.json(
        { error: 'Only the primary contact can update station information' },
        { status: 403 }
      );
    }

    if (!user.radioStationId) {
      return NextResponse.json({ error: 'User is not associated with a station' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateStationSchema.parse(body);

    // Clean empty string values
    const cleanedData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== '')
    );

    // Update station information
    const updatedStation = await prisma.station.update({
      where: { id: user.radioStationId },
      data: {
        ...cleanedData,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'STATION_UPDATE',
        entityType: 'STATION',
        entityId: user.radioStationId,
        metadata: {
          updatedFields: Object.keys(cleanedData),
          previousValues: Object.keys(cleanedData).reduce((acc, key) => {
            acc[key] = user.radioStation?.[key as keyof typeof user.radioStation];
            return acc;
          }, {} as any),
        },
      },
    });

    return NextResponse.json({
      message: 'Station information updated successfully',
      station: updatedStation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating station:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}