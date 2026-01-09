import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Initialize R2 client
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export interface BlobFile {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
  originalFilename: string;
  format: string;
  duration?: number;
}

/**
 * Upload audio file to Cloudflare R2
 */
export async function uploadAudioFile(
  file: File,
  folder: string = 'newsroom/audio'
): Promise<BlobFile> {
  try {
    // Generate a unique filename with folder structure
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pathname = `${folder}/${timestamp}-${sanitizedName}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    await R2.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: pathname,
      Body: buffer,
      ContentType: file.type,
    }));

    // Construct the public URL
    const url = `${PUBLIC_URL}/${pathname}`;

    return {
      url,
      pathname,
      size: file.size,
      uploadedAt: new Date(),
      originalFilename: file.name,
      format: fileExtension || 'unknown',
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete audio file from R2
 */
export async function deleteAudioFile(url: string): Promise<void> {
  try {
    // Extract the key from the URL
    const key = url.replace(`${PUBLIC_URL}/`, '');

    await R2.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file metadata from R2
 */
export async function getFileMetadata(url: string) {
  try {
    const key = url.replace(`${PUBLIC_URL}/`, '');

    const response = await R2.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType,
      lastModified: response.LastModified,
    };
  } catch (error) {
    console.error('R2 metadata error:', error);
    throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate audio file before upload
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
    'audio/mpeg',    // MP3
    'audio/wav',     // WAV
    'audio/ogg',     // OGG
    'audio/mp4',     // M4A
    'audio/x-m4a',   // M4A (alternative MIME type)
    'audio/aac',     // AAC
  ];

  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Only MP3, WAV, OGG, M4A, and AAC files are allowed.`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large: ${file.name}. Maximum size is 100MB.`,
    };
  }

  return { valid: true };
}

/**
 * Get optimized audio URL (R2 serves directly, no transformations)
 */
export function getOptimizedAudioUrl(url: string): string {
  return url;
}
