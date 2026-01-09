import { PrismaClient, ClassificationType } from '@prisma/client';

// Direct production database connection
const PRODUCTION_DATABASE_URL = 'postgresql://neondb_owner:npg_q7N1owMIiWnp@ep-lingering-sun-abx8zkr7-pooler.eu-west-2.aws.neon.tech/newskoopdb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: PRODUCTION_DATABASE_URL
    }
  }
});

async function main() {
  console.log('🌱 Starting PRODUCTION database categories and classifications seeding...');
  console.log('📡 Connecting to production database: ep-lingering-sun-abx8zkr7');

  // Create Level 1 Categories
  console.log('\n📂 Creating Level 1 Categories...');
  const categories = [
    { name: 'News Bulletins', description: 'Short news updates and bulletins' },
    { name: 'News Stories', description: 'In-depth news articles and reports' },
    { name: 'Sports', description: 'Sports news and coverage' },
    { name: 'Finance', description: 'Financial news and market updates' },
    { name: 'Speciality', description: 'Special interest and feature content' },
  ];

  for (const category of categories) {
    const slug = category.name.toLowerCase().replace(/\s+/g, '-');

    try {
      const createdCategory = await prisma.category.upsert({
        where: { slug },
        update: {
          description: category.description,
        },
        create: {
          name: category.name,
          slug,
          description: category.description,
          level: 1,
          isParent: true,
          isEditable: false, // Level 1 categories are protected
        },
      });
      console.log(`✅ PRODUCTION Category created/updated: ${createdCategory.name}`);
    } catch (error) {
      console.error(`❌ Failed to create category ${category.name}:`, error);
    }
  }

  // Create Language Classifications
  console.log('\n🗣️ Creating Language Classifications...');
  const languageClassifications = [
    { name: 'English', slug: 'english' },
    { name: 'Afrikaans', slug: 'afrikaans' },
    { name: 'Xhosa', slug: 'xhosa' },
  ];

  for (const classification of languageClassifications) {
    try {
      const createdClassification = await prisma.classification.upsert({
        where: { slug: classification.slug },
        update: {
          type: ClassificationType.LANGUAGE,
          isActive: true,
        },
        create: {
          name: classification.name,
          slug: classification.slug,
          type: ClassificationType.LANGUAGE,
          isActive: true,
        },
      });
      console.log(`✅ PRODUCTION Language classification created/updated: ${createdClassification.name}`);
    } catch (error) {
      console.error(`❌ Failed to create language classification ${classification.name}:`, error);
    }
  }

  // Create Religion Classifications
  console.log('\n⛪ Creating Religion Classifications...');
  const religionClassifications = [
    { name: 'Christian', slug: 'christian' },
    { name: 'Muslim', slug: 'muslim' },
    { name: 'Neutral', slug: 'neutral' },
  ];

  for (const classification of religionClassifications) {
    try {
      const createdClassification = await prisma.classification.upsert({
        where: { slug: classification.slug },
        update: {
          type: ClassificationType.RELIGION,
          isActive: true,
        },
        create: {
          name: classification.name,
          slug: classification.slug,
          type: ClassificationType.RELIGION,
          isActive: true,
        },
      });
      console.log(`✅ PRODUCTION Religion classification created/updated: ${createdClassification.name}`);
    } catch (error) {
      console.error(`❌ Failed to create religion classification ${classification.name}:`, error);
    }
  }

  console.log('\n🎉 PRODUCTION database categories and classifications seeding completed!');
  console.log('📊 Summary:');
  console.log(`   - ${categories.length} Level 1 Categories`);
  console.log(`   - ${languageClassifications.length} Language Classifications`);
  console.log(`   - ${religionClassifications.length} Religion Classifications`);
}

main()
  .catch((e) => {
    console.error('❌ Production categories/tags seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });