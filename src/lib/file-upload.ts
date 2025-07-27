import { uploadAudioFile, validateAudioFile as supabaseValidateAudioFile, SupabaseFile } from './supabase';

export interface UploadedFile {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
}

export async function saveUploadedFile(
  file: File,
  uploadDir: string = 'stories'
): Promise<UploadedFile> {
  // Validate file first
  const validation = validateAudioFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // Upload to Supabase Storage
    const supabaseFile: SupabaseFile = await uploadAudioFile(file, uploadDir);
    
    return {
      filename: supabaseFile.path,
      originalName: file.name,
      url: supabaseFile.publicUrl,
      size: file.size,
      mimeType: file.type,
    };
  } catch (error) {
    console.error('Error uploading file to Supabase:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Use the Supabase validation function
  return supabaseValidateAudioFile(file);
} 