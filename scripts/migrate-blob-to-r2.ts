/**
 * Migration script: Vercel Blob -> Cloudflare R2
 *
 * Run with: npx ts-node scripts/migrate-blob-to-r2.ts
 */

import { list, head } from '@vercel/blob';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Initialize R2 client
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

interface MigrationResult {
  success: boolean;
  oldUrl: string;
  newUrl?: string;
  error?: string;
}

async function downloadFromBlob(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await R2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

async function migrateFile(blobUrl: string): Promise<MigrationResult> {
  try {
    // Extract the path from the Vercel Blob URL
    // URL format: https://xxxxx.public.blob.vercel-storage.com/newsroom/audio/filename.mp3
    const urlObj = new URL(blobUrl);
    const key = urlObj.pathname.substring(1); // Remove leading slash

    console.log(`  Downloading: ${key}`);

    // Get file metadata from Vercel Blob
    const metadata = await head(blobUrl);
    const contentType = metadata.contentType || 'audio/mpeg';

    // Download the file
    const buffer = await downloadFromBlob(blobUrl);
    console.log(`  Downloaded: ${buffer.length} bytes`);

    // Upload to R2
    console.log(`  Uploading to R2...`);
    const newUrl = await uploadToR2(buffer, key, contentType);
    console.log(`  Uploaded: ${newUrl}`);

    return {
      success: true,
      oldUrl: blobUrl,
      newUrl,
    };
  } catch (error) {
    return {
      success: false,
      oldUrl: blobUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log('=== Vercel Blob to R2 Migration ===\n');

  // Check environment variables
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Error: BLOB_READ_WRITE_TOKEN not found in environment');
    process.exit(1);
  }

  if (!R2_BUCKET || !R2_PUBLIC_URL) {
    console.error('Error: R2 configuration not found in environment');
    process.exit(1);
  }

  console.log('R2 Bucket:', R2_BUCKET);
  console.log('R2 Public URL:', R2_PUBLIC_URL);
  console.log('');

  // Get all audio clips from database
  console.log('Fetching audio clips from database...');
  const audioClips = await prisma.audioClip.findMany({
    select: {
      id: true,
      url: true,
      originalName: true,
    },
  });

  console.log(`Found ${audioClips.length} audio clips\n`);

  if (audioClips.length === 0) {
    console.log('No audio clips to migrate.');
    return;
  }

  // Filter only Vercel Blob URLs
  const blobClips = audioClips.filter(clip =>
    clip.url.includes('blob.vercel-storage.com')
  );

  console.log(`${blobClips.length} clips need migration (Vercel Blob URLs)\n`);

  if (blobClips.length === 0) {
    console.log('All clips already migrated or using different storage.');
    return;
  }

  // Migrate each file
  const results: MigrationResult[] = [];

  for (let i = 0; i < blobClips.length; i++) {
    const clip = blobClips[i];
    console.log(`[${i + 1}/${blobClips.length}] Migrating: ${clip.originalName}`);

    const result = await migrateFile(clip.url);
    results.push(result);

    if (result.success && result.newUrl) {
      // Update database
      await prisma.audioClip.update({
        where: { id: clip.id },
        data: { url: result.newUrl },
      });
      console.log(`  Database updated\n`);
    } else {
      console.log(`  FAILED: ${result.error}\n`);
    }
  }

  // Summary
  console.log('\n=== Migration Summary ===');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed migrations:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.oldUrl}: ${r.error}`));
  }

  console.log('\nMigration complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
