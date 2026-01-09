import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all clips with Vercel Blob URLs
  const blobClips = await prisma.audioClip.findMany({
    where: {
      url: { contains: 'blob.vercel-storage.com' }
    }
  });

  console.log(`Found ${blobClips.length} Vercel Blob audio clips to delete`);

  if (blobClips.length === 0) {
    console.log('Nothing to delete!');
    return;
  }

  // Delete them
  const result = await prisma.audioClip.deleteMany({
    where: {
      url: { contains: 'blob.vercel-storage.com' }
    }
  });

  console.log(`Deleted ${result.count} audio clips`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
