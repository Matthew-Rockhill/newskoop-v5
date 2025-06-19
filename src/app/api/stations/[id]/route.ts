import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/stations/[id] - Get a single station
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const station = await prisma.station.findUnique({
      where: { id: params.id },
      include: {
        users: {
          where: { isPrimaryContact: true },
          select: { 
            id: true, 
            firstName: true,
            lastName: true,
            email: true,
            mobileNumber: true,
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
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();

    // Check if station exists
    const existingStation = await prisma.station.findUnique({
      where: { id: params.id }
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
          NOT: { id: params.id },
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
      where: { id: params.id },
      data: {
        name: data.name,
        province: data.province,
        contactEmail: data.contactEmail,
        contactNumber: data.contactNumber,
        isActive: data.isActive !== undefined ? data.isActive : existingStation.isActive,
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

    // If station is being deactivated, deactivate all users
    if (data.isActive === false && existingStation.isActive === true) {
      await prisma.user.updateMany({
        where: { radioStationId: params.id },
        data: { isActive: false }
      });
    }
    
    // If station is being activated, activate all users
    if (data.isActive === true && existingStation.isActive === false) {
      await prisma.user.updateMany({
        where: { radioStationId: params.id },
        data: { isActive: true }
      });
    }

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
  { params }: { params: { id: string } }
) {
  try {
    // Check if station exists and has users
    const station = await prisma.station.findUnique({
      where: { id: params.id },
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
      where: { id: params.id },
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