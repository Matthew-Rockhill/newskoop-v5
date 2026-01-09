import { uploadAudioFile, validateAudioFile as r2ValidateAudioFile, BlobFile } from './r2-storage';

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
    // Upload to R2
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
    console.error('Error uploading file to R2:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Use the R2 validation function
  return r2ValidateAudioFile(file);
}
