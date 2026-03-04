import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.userType !== 'RADIO') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File must be a JPEG, PNG, WebP, or GIF image' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 2MB' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const pathname = `station-logos/station-logo-${user.radioStationId}-${timestamp}.${ext}`;

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Update station's logo URL
    const updatedStation = await prisma.station.update({
      where: { id: user.radioStationId },
      data: {
        logoUrl: blob.url,
        updatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'STATION_LOGO_UPLOAD',
        entityType: 'STATION',
        entityId: user.radioStationId,
        metadata: {
          filename: pathname,
          fileSize: file.size,
          fileType: file.type,
          previousLogoUrl: user.radioStation?.logoUrl,
        },
      },
    });

    return NextResponse.json({
      message: 'Station logo uploaded successfully',
      logoUrl: blob.url,
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
