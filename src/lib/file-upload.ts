import { uploadAudioFile, validateAudioFile as blobValidateAudioFile, BlobFile } from './vercel-blob';

export interface UploadedFile {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  duration?: number;
}

export async function saveUploadedFile(
  file: File,
  uploadDir: string = 'newsroom/audio'
): Promise<UploadedFile> {
  // Validate file first
  const validation = validateAudioFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // Upload to Vercel Blob
    const blobFile: BlobFile = await uploadAudioFile(file, uploadDir);
    
    return {
      filename: blobFile.pathname,
      originalName: blobFile.originalFilename,
      url: blobFile.url,
      size: blobFile.size,
      mimeType: file.type,
      duration: blobFile.duration,
    };
  } catch (error) {
    console.error('Error uploading file to Vercel Blob:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Use the Vercel Blob validation function
  return blobValidateAudioFile(file);
} 