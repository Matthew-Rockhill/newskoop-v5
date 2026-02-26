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

    // Allow both RADIO and STAFF users to upload profile pictures

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
    const filename = `profile-${session.user.id}-${timestamp}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file to public/uploads/profiles
    const filePath = join(uploadsDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Update user's profile picture URL
    const profilePictureUrl = `/uploads/profiles/${filename}`;
    
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        profilePictureUrl,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PROFILE_PICTURE_UPLOAD',
        entityType: 'USER',
        entityId: session.user.id,
        metadata: {
          filename,
          fileSize: file.size,
          fileType: file.type,
        },
      },
    });

    return NextResponse.json({
      message: 'Profile picture uploaded successfully',
      profilePictureUrl,
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}