import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/stations/[id] - Get a single station
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        users: {
          select: { 
            id: true, 
            firstName: true,
            lastName: true,
            email: true,
            mobileNumber: true,
            isPrimaryContact: true,
          },
        },
        _count: {
          select: { users: true }
        }
      },
    });

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(station);
  } catch (error) {
    console.error('Error fetching station:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station' },
      { status: 500 }
    );
  }
}

// PATCH /api/stations/[id] - Update a station
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Check if station exists
    const existingStation = await prisma.station.findUnique({
      where: { id }
    });

    if (!existingStation) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    // Check if name is being changed and if it's already taken
    if (data.name && data.name !== existingStation.name) {
      const stationWithSameName = await prisma.station.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (stationWithSameName) {
        return NextResponse.json(
          { error: 'A station with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Update station
    const updatedStation = await prisma.station.update({
      where: { id },
      data: {
        name: data.name,
        province: data.province,
        contactEmail: data.contactEmail,
        contactNumber: data.contactNumber,
        isActive: data.isActive !== undefined ? data.isActive : existingStation.isActive,
        hasContentAccess: data.hasContentAccess !== undefined ? data.hasContentAccess : existingStation.hasContentAccess,
        allowedLanguages: data.allowedLanguages !== undefined ? data.allowedLanguages : existingStation.allowedLanguages,
        allowedReligions: data.allowedReligions !== undefined ? data.allowedReligions : existingStation.allowedReligions,
        blockedCategories: data.blockedCategories !== undefined ? data.blockedCategories : existingStation.blockedCategories,
      },
      include: {
        users: {
          where: { isPrimaryContact: true },
          select: { 
            id: true, 
            firstName: true,
            lastName: true,
            email: true 
          },
        },
        _count: {
          select: { users: true }
        }
      },
    });

    // TODO: Add user activation/deactivation logic if needed

    return NextResponse.json(updatedStation);
  } catch (error) {
    console.error('Error updating station:', error);
    return NextResponse.json(
      { error: 'Failed to update station' },
      { status: 500 }
    );
  }
}

// DELETE /api/stations/[id] - Delete a station
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;
    // Check if station exists and has users
    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    if (station._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete station with active users. Please remove all users first.' },
        { status: 400 }
      );
    }

    // Delete the station
    await prisma.station.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting station:', error);
    return NextResponse.json(
      { error: 'Failed to delete station' },
      { status: 500 }
    );
  }
}