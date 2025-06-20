import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST /api/stations/[id]/users - Add new users to station
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { users } = data;

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Users array is required' },
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

    // Check for duplicate emails
    const emails = users.map(user => user.email);
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } }
    });

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: `Email already exists: ${existingUsers.map(u => u.email).join(', ')}` },
        { status: 400 }
      );
    }

    // Create users
    const createdUsers = [];
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await prisma.user.create({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          mobileNumber: userData.mobileNumber || null,
          password: hashedPassword,
          userType: 'RADIO',
          isPrimaryContact: false,
          radioStationId: params.id,
          isActive: station.isActive, // Match station's active status
        },
      });
      
      createdUsers.push(user);
    }

    return NextResponse.json({ 
      success: true, 
      users: createdUsers.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
      }))
    });
  } catch (error) {
    console.error('Error adding users:', error);
    return NextResponse.json(
      { error: 'Failed to add users' },
      { status: 500 }
    );
  }
}

// DELETE /api/stations/[id]/users - Remove users from station
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { userIds } = data;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
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

    // Check if any of the users to be deleted is the primary contact
    const primaryContact = await prisma.user.findFirst({
      where: { 
        radioStationId: params.id,
        isPrimaryContact: true,
        id: { in: userIds }
      }
    });

    if (primaryContact) {
      return NextResponse.json(
        { error: 'Cannot delete primary contact. Please assign a different primary contact first.' },
        { status: 400 }
      );
    }

    // Verify all users belong to this station
    const usersToDelete = await prisma.user.findMany({
      where: { 
        id: { in: userIds },
        radioStationId: params.id
      }
    });

    if (usersToDelete.length !== userIds.length) {
      return NextResponse.json(
        { error: 'Some users do not belong to this station' },
        { status: 400 }
      );
    }

    // Delete users
    await prisma.user.deleteMany({
      where: { 
        id: { in: userIds },
        radioStationId: params.id
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `${userIds.length} user(s) removed successfully`,
      deletedUserIds: userIds
    });
  } catch (error) {
    console.error('Error removing users:', error);
    return NextResponse.json(
      { error: 'Failed to remove users' },
      { status: 500 }
    );
  }
} 