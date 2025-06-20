import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/stations/[id]/primary-contact - Update primary contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { primaryContactId } = data;

    if (!primaryContactId) {
      return NextResponse.json(
        { error: 'Primary contact ID is required' },
        { status: 400 }
      );
    }

    // Check if station exists
    const station = await prisma.station.findUnique({
      where: { id: params.id }
    });

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    // Check if the new primary contact belongs to this station
    const newPrimaryContact = await prisma.user.findFirst({
      where: { 
        id: primaryContactId,
        radioStationId: params.id
      }
    });

    if (!newPrimaryContact) {
      return NextResponse.json(
        { error: 'User not found or does not belong to this station' },
        { status: 400 }
      );
    }

    // Update all users to remove primary contact status
    await prisma.user.updateMany({
      where: { radioStationId: params.id },
      data: { isPrimaryContact: false }
    });

    // Set the new primary contact
    await prisma.user.update({
      where: { id: primaryContactId },
      data: { isPrimaryContact: true }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Primary contact updated successfully' 
    });
  } catch (error) {
    console.error('Error updating primary contact:', error);
    return NextResponse.json(
      { error: 'Failed to update primary contact' },
      { status: 500 }
    );
  }
} 