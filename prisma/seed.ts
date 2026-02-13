import { PrismaClient, UserType, StaffRole, ClassificationType } from '@prisma/client';
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
    { name: 'Sports News', description: 'Sports news and coverage' },
    { name: 'Finance', description: 'Financial news and market updates' },
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
      { name: 'Paperskoops', description: 'Print media highlights and reviews' },
      { name: 'Goodskoops', description: 'Community good news and positive stories' },
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

  // Create Level 2 Categories for Sports News
  const sportsParent = await prisma.category.findUnique({
    where: { slug: 'sports-news' }
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

  // Create Shows
  const showsToCreate = [
    { title: 'Lifestyle', description: 'Lifestyle trends, health, and wellness' },
    { title: 'Agriskoops', description: 'Agricultural news and farming updates' },
    { title: 'Techskoops', description: 'Technology news and digital innovation' },
  ];

  for (const showData of showsToCreate) {
    const slug = showData.title.toLowerCase().replace(/\s+/g, '-');

    await prisma.show.upsert({
      where: { slug },
      update: {},
      create: {
        title: showData.title,
        slug,
        description: showData.description,
        isPublished: true,
        isActive: true,
        createdById: adminUser.id,
      },
    });
    console.log(`✅ Show created: ${showData.title}`);
  }

  // Create Sportskoops parent show with sub-shows
  const sportskoopsSlug = 'sportskoops';
  const sportskoops = await prisma.show.upsert({
    where: { slug: sportskoopsSlug },
    update: {},
    create: {
      title: 'Sportskoops',
      slug: sportskoopsSlug,
      description: 'Sports news, analysis, and coverage',
      isPublished: true,
      isActive: true,
      createdById: adminUser.id,
    },
  });
  console.log('✅ Show created: Sportskoops');

  const subShows = [
    { title: 'Rugby', description: 'Rugby news and match coverage' },
    { title: 'Cricket', description: 'Cricket news and match coverage' },
    { title: 'F1', description: 'Formula 1 racing news and updates' },
    { title: 'Soccer', description: 'Soccer news and match coverage' },
    { title: 'Tennis', description: 'Tennis news and tournament coverage' },
  ];

  for (const subShowData of subShows) {
    const slug = subShowData.title.toLowerCase().replace(/\s+/g, '-');

    await prisma.show.upsert({
      where: { slug },
      update: {},
      create: {
        title: subShowData.title,
        slug,
        description: subShowData.description,
        isPublished: true,
        isActive: true,
        createdById: adminUser.id,
        parentId: sportskoops.id,
      },
    });
    console.log(`✅ Sub-show created: ${subShowData.title}`);
  }

  // Create Language Classifications
  const languageClassifications = [
    { name: 'English', slug: 'english' },
    { name: 'Afrikaans', slug: 'afrikaans' },
    { name: 'Xhosa', slug: 'xhosa' },
  ];

  for (const classification of languageClassifications) {
    await prisma.classification.upsert({
      where: { slug: classification.slug },
      update: {},
      create: {
        name: classification.name,
        slug: classification.slug,
        type: ClassificationType.LANGUAGE,
        isActive: true,
      },
    });
    console.log(`✅ Language classification created: ${classification.name}`);
  }

  // Create Religion Classifications
  const religionClassifications = [
    { name: 'Christian', slug: 'christian' },
    { name: 'Muslim', slug: 'muslim' },
    { name: 'Neutral', slug: 'neutral' },
  ];

  for (const classification of religionClassifications) {
    await prisma.classification.upsert({
      where: { slug: classification.slug },
      update: {},
      create: {
        name: classification.name,
        slug: classification.slug,
        type: ClassificationType.RELIGION,
        isActive: true,
      },
    });
    console.log(`✅ Religion classification created: ${classification.name}`);
  }

  // Create Locality Classifications for South African Provinces
  const localityClassifications = [
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

  for (const classification of localityClassifications) {
    await prisma.classification.upsert({
      where: { slug: classification.slug },
      update: {},
      create: {
        name: classification.name,
        slug: classification.slug,
        type: ClassificationType.LOCALITY,
        isActive: true,
      },
    });
    console.log(`✅ Locality classification created: ${classification.name}`);
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