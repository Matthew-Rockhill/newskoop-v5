import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
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
        { error: 'Only the primary contact can upload station logo' },
        { status: 403 }
      );
    }

    if (!user.radioStationId) {
      return NextResponse.json({ error: 'User is not associated with a station' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 2MB' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `station-logo-${user.radioStationId}-${timestamp}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'station-logos');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file to public/uploads/station-logos
    const filePath = join(uploadsDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Update station's logo URL
    const logoUrl = `/uploads/station-logos/${filename}`;
    
    const updatedStation = await prisma.station.update({
      where: { id: user.radioStationId },
      data: {
        logoUrl,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'STATION_LOGO_UPLOAD',
        entityType: 'STATION',
        entityId: user.radioStationId,
        metadata: {
          filename,
          fileSize: file.size,
          fileType: file.type,
          previousLogoUrl: user.radioStation?.logoUrl,
        },
      },
    });

    return NextResponse.json({
      message: 'Station logo uploaded successfully',
      logoUrl,
      station: updatedStation,
    });
  } catch (error) {
    console.error('Error uploading station logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}