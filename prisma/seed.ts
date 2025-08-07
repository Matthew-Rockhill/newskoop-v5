import { PrismaClient, UserType, StaffRole, TagCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create superadmin user
  const hashedPassword = await bcrypt.hash('Mw5883Rl$', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'mrockhill@gmail.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'mrockhill@gmail.com',
      firstName: 'Matthew',
      lastName: 'Rockhill',
      password: hashedPassword,
      userType: UserType.STAFF,
      staffRole: StaffRole.SUPERADMIN,
      isActive: true,
    },
  });

  console.log('✅ Superadmin user created:', adminUser.email);

  // Create Level 1 Categories
  const categories = [
    { name: 'News Bulletins', description: 'Short news updates and bulletins' },
    { name: 'News Stories', description: 'In-depth news articles and reports' },
    { name: 'Sports', description: 'Sports news and coverage' },
    { name: 'Finance', description: 'Financial news and market updates' },
    { name: 'Speciality', description: 'Special interest and feature content' },
  ];

  for (const category of categories) {
    const slug = category.name.toLowerCase().replace(/\s+/g, '-');
    
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: {
        name: category.name,
        slug,
        description: category.description,
        level: 1,
        isParent: true,
        isEditable: false, // Level 1 categories are protected
      },
    });
    console.log(`✅ Category created: ${category.name}`);
  }

  // Create Language Tags
  const languageTags = [
    { name: 'English', slug: 'english' },
    { name: 'Afrikaans', slug: 'afrikaans' },
    { name: 'Xhosa', slug: 'xhosa' },
  ];

  for (const tag of languageTags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        name: tag.name,
        slug: tag.slug,
        category: TagCategory.LANGUAGE,
        isRequired: true,
        isPreset: true,
      },
    });
    console.log(`✅ Language tag created: ${tag.name}`);
  }

  // Create Religion Tags
  const religionTags = [
    { name: 'Christian', slug: 'christian' },
    { name: 'Muslim', slug: 'muslim' },
    { name: 'Neutral', slug: 'neutral' },
  ];

  for (const tag of religionTags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        name: tag.name,
        slug: tag.slug,
        category: TagCategory.RELIGION,
        isRequired: true,
        isPreset: true,
      },
    });
    console.log(`✅ Religion tag created: ${tag.name}`);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });