import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for server-side operations (full access)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Client for client-side operations (row-level security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage bucket configuration
export const STORAGE_BUCKET = 'audio-files';

export interface SupabaseFile {
  path: string;
  fullPath: string;
  publicUrl: string;
}

/**
 * Upload audio file to Supabase Storage
 */
export async function uploadAudioFile(
  file: File,
  folder: string = 'stories'
): Promise<SupabaseFile> {
  const fileExtension = file.name.split('.').pop() || '';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return {
    path: fileName,
    fullPath: filePath,
    publicUrl
  };
}

/**
 * Delete audio file from Supabase Storage
 */
export async function deleteAudioFile(filePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Validate audio file before upload
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Only MP3, WAV, OGG, and M4A files are allowed.`,
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