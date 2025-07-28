import { put, del, head } from '@vercel/blob';

export interface BlobFile {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
  originalFilename: string;
  format: string;
  duration?: number; // For audio files (we'll need to extract this ourselves)
}

/**
 * Upload audio file to Vercel Blob
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

    // Upload to Vercel Blob
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false, // We're already adding timestamp for uniqueness
    });

    // Get file metadata
    const metadata = await head(blob.url);

    return {
      url: blob.url,
      pathname: blob.pathname,
      size: metadata.size,
      uploadedAt: metadata.uploadedAt,
      originalFilename: file.name,
      format: fileExtension || 'unknown',
      // Note: Vercel Blob doesn't automatically extract audio duration like Cloudinary
      // We could add audio duration extraction here if needed in the future
    };
  } catch (error) {
    console.error('Vercel Blob upload error:', error);
    throw new Error(`Failed to upload file to Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete audio file from Vercel Blob
 */
export async function deleteAudioFile(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error('Vercel Blob delete error:', error);
    throw new Error(`Failed to delete file from Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file metadata from Vercel Blob
 */
export async function getFileMetadata(url: string) {
  try {
    return await head(url);
  } catch (error) {
    console.error('Vercel Blob metadata error:', error);
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
  
  // Vercel Blob supports up to 5TB files, but let's keep a reasonable limit for audio
  const maxSize = 100 * 1024 * 1024; // 100MB (much more generous than Cloudinary's 10MB)

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
 * Get optimized audio URL (for Vercel Blob, URLs are already optimized)
 */
export function getOptimizedAudioUrl(
  url: string,
  options: {
    quality?: 'auto' | 'auto:low' | 'auto:good' | 'auto:best';
    format?: 'mp3' | 'ogg' | 'wav' | 'auto';
  } = {}
): string {
  // Vercel Blob doesn't support audio transformations like Cloudinary
  // URLs are already optimized for delivery
  // If audio transformations are needed, they would need to be handled differently
  return url;
}