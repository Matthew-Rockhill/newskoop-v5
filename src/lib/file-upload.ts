import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

export interface UploadedFile {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
}

export async function saveUploadedFile(
  file: File,
  uploadDir: string = '/uploads/audio'
): Promise<UploadedFile> {
  // Ensure upload directory exists
  const fullUploadDir = join(process.cwd(), 'public', uploadDir);
  
  try {
    await mkdir(fullUploadDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's okay
  }

  // Generate unique filename
  const fileExtension = file.name.split('.').pop() || '';
  const uniqueFilename = `${randomBytes(16).toString('hex')}.${fileExtension}`;
  const filePath = join(fullUploadDir, uniqueFilename);

  // Convert File to Buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Write file to disk
  await writeFile(filePath, buffer);

  return {
    filename: uniqueFilename,
    originalName: file.name,
    url: `${uploadDir}/${uniqueFilename}`,
    size: file.size,
    mimeType: file.type,
  };
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Only MP3, WAV, OGG, and MP4 files are allowed.`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large: ${file.name}. Maximum size is 50MB.`,
    };
  }

  return { valid: true };
} 