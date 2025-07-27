import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryFile {
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  duration?: number; // For audio files
}

/**
 * Upload audio file to Cloudinary
 */
export async function uploadAudioFile(
  file: File,
  folder: string = 'newsroom/audio'
): Promise<CloudinaryFile> {
  try {
    // Convert File to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: 'raw', // For non-image files like audio
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      format: 'auto', // Let Cloudinary determine the format
      tags: ['newsroom', 'audio'], // For organization
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      original_filename: result.original_filename || file.name,
      format: result.format,
      bytes: result.bytes,
      duration: result.duration, // Cloudinary automatically detects audio duration
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload file to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete audio file from Cloudinary
 */
export async function deleteAudioFile(publicId: string): Promise<void> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw'
    });
    
    if (result.result !== 'ok') {
      throw new Error(`Failed to delete file: ${result.result}`);
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete file from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get optimized audio URL with transformations
 */
export function getOptimizedAudioUrl(
  publicId: string,
  options: {
    quality?: 'auto' | 'auto:low' | 'auto:good' | 'auto:best';
    format?: 'mp3' | 'ogg' | 'wav' | 'auto';
  } = {}
): string {
  const { quality = 'auto:good', format = 'auto' } = options;
  
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    quality,
    format,
    secure: true,
  });
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
  
  const maxSize = 10 * 1024 * 1024; // 10MB (Cloudinary free tier limit)

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Only MP3, WAV, OGG, M4A, and AAC files are allowed.`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large: ${file.name}. Maximum size is 10MB.`,
    };
  }

  return { valid: true };
}

/**
 * Generate signed upload parameters for client-side uploads
 * This is more secure than uploading through the server
 */
export function generateSignedUploadParams(folder: string = 'newsroom/audio') {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  const params = {
    timestamp,
    folder,
    resource_type: 'raw',
    tags: 'newsroom,audio',
    use_filename: true,
    unique_filename: true,
  };

  // Generate signature
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);

  return {
    ...params,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  };
}

export default cloudinary;