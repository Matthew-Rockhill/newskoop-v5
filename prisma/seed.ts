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

  // Create test users for each staff role
  const testUsers = [
    { email: 'intern@newskoop.com', firstName: 'Test', lastName: 'Intern', role: StaffRole.INTERN, password: 'Intern@123' },
    { email: 'journalist@newskoop.com', firstName: 'Test', lastName: 'Journalist', role: StaffRole.JOURNALIST, password: 'Journalist@123' },
    { email: 'subeditor@newskoop.com', firstName: 'Test', lastName: 'SubEditor', role: StaffRole.SUB_EDITOR, password: 'SubEditor@123' },
    { email: 'editor@newskoop.com', firstName: 'Test', lastName: 'Editor', role: StaffRole.EDITOR, password: 'Editor@123' },
    { email: 'admin@newskoop.com', firstName: 'Test', lastName: 'Admin', role: StaffRole.ADMIN, password: 'Admin@123' },
  ];

  for (const testUser of testUsers) {
    const hashedTestPassword = await bcrypt.hash(testUser.password, 12);

    await prisma.user.upsert({
      where: { email: testUser.email },
      update: {
        password: hashedTestPassword,
      },
      create: {
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        password: hashedTestPassword,
        userType: UserType.STAFF,
        staffRole: testUser.role,
        isActive: true,
      },
    });

    console.log(`✅ Test user created: ${testUser.email} (${testUser.role})`);
  }

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

  // Create Level 2 Categories for News Stories
  const newsStoriesParent = await prisma.category.findUnique({
    where: { slug: 'news-stories' }
  });

  if (newsStoriesParent) {
    const level2Categories = [
      { name: 'International News', description: 'News from around the world' },
      { name: 'South African Community News', description: 'Local community news by province' },
      { name: 'South African National News', description: 'National news and politics' },
    ];

    for (const category of level2Categories) {
      const slug = category.name.toLowerCase().replace(/\s+/g, '-');
      
      await prisma.category.upsert({
        where: { slug },
        update: {},
        create: {
          name: category.name,
          slug,
          description: category.description,
          level: 2,
          isParent: false,
          parentId: newsStoriesParent.id,
        },
      });
      console.log(`✅ Level 2 Category created: ${category.name}`);
    }
  }

  // Create Level 2 Categories for Sports
  const sportsParent = await prisma.category.findUnique({
    where: { slug: 'sports' }
  });

  if (sportsParent) {
    const sportsLevel2Categories = [
      { name: 'Sports News Stories', description: 'Latest sports news and coverage' },
      { name: 'Morning Update', description: 'Morning sports updates and highlights' },
      { name: 'Afternoon Update', description: 'Afternoon sports updates and results' },
      { name: 'Wiele2Wiele', description: 'Weekly sports analysis and commentary' },
    ];

    for (const category of sportsLevel2Categories) {
      const slug = category.name.toLowerCase().replace(/\s+/g, '-');
      
      await prisma.category.upsert({
        where: { slug },
        update: {},
        create: {
          name: category.name,
          slug,
          description: category.description,
          level: 2,
          isParent: false,
          parentId: sportsParent.id,
        },
      });
      console.log(`✅ Sports Level 2 Category created: ${category.name}`);
    }
  }

  // Create Level 2 Categories for Finance
  const financeParent = await prisma.category.findUnique({
    where: { slug: 'finance' }
  });

  if (financeParent) {
    const financeLevel2Categories = [
      { name: 'Bizskoops', description: 'Business news and market analysis' },
      { name: 'Lunch Time Report', description: 'Midday market updates and financial news' },
      { name: 'Evening Report', description: 'End-of-day market summary and analysis' },
    ];

    for (const category of financeLevel2Categories) {
      const slug = category.name.toLowerCase().replace(/\s+/g, '-');
      
      await prisma.category.upsert({
        where: { slug },
        update: {},
        create: {
          name: category.name,
          slug,
          description: category.description,
          level: 2,
          isParent: false,
          parentId: financeParent.id,
        },
      });
      console.log(`✅ Finance Level 2 Category created: ${category.name}`);
    }
  }

  // Create Level 2 Categories for Speciality
  const specialityParent = await prisma.category.findUnique({
    where: { slug: 'speciality' }
  });

  if (specialityParent) {
    const specialityLevel2Categories = [
      { name: 'Lifestyle', description: 'Lifestyle trends, health, and wellness' },
      { name: 'Agriskoops', description: 'Agricultural news and farming updates' },
      { name: 'Techskoops', description: 'Technology news and digital innovation' },
      { name: 'Paperskoops', description: 'Print media highlights and reviews' },
      { name: 'Goodskoops', description: 'Community good news and positive stories' },
    ];

    for (const category of specialityLevel2Categories) {
      const slug = category.name.toLowerCase().replace(/\s+/g, '-');
      
      await prisma.category.upsert({
        where: { slug },
        update: {},
        create: {
          name: category.name,
          slug,
          description: category.description,
          level: 2,
          isParent: false,
          parentId: specialityParent.id,
        },
      });
      console.log(`✅ Speciality Level 2 Category created: ${category.name}`);
    }
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

  // Create Locality Tags for South African Provinces
  const localityTags = [
    { name: 'Eastern Cape', slug: 'eastern-cape' },
    { name: 'Free State', slug: 'free-state' },
    { name: 'Gauteng', slug: 'gauteng' },
    { name: 'KwaZulu-Natal', slug: 'kwazulu-natal' },
    { name: 'Limpopo', slug: 'limpopo' },
    { name: 'Mpumalanga', slug: 'mpumalanga' },
    { name: 'Northern Cape', slug: 'northern-cape' },
    { name: 'North West', slug: 'north-west' },
    { name: 'Western Cape', slug: 'western-cape' },
  ];

  for (const tag of localityTags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        name: tag.name,
        slug: tag.slug,
        category: TagCategory.LOCALITY,
        isRequired: false,
        isPreset: true,
      },
    });
    console.log(`✅ Locality tag created: ${tag.name}`);
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