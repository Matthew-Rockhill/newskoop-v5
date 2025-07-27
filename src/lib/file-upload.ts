import { uploadAudioFile, validateAudioFile as cloudinaryValidateAudioFile, CloudinaryFile } from './cloudinary';

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
    // Upload to Cloudinary
    const cloudinaryFile: CloudinaryFile = await uploadAudioFile(file, uploadDir);
    
    return {
      filename: cloudinaryFile.public_id,
      originalName: cloudinaryFile.original_filename,
      url: cloudinaryFile.secure_url,
      size: cloudinaryFile.bytes,
      mimeType: file.type,
      duration: cloudinaryFile.duration,
    };
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Use the Cloudinary validation function
  return cloudinaryValidateAudioFile(file);
} 