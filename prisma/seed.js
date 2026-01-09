const { PrismaClient, UserType, StaffRole, ClassificationType } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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

  // Create additional staff users for each role
  const staffUsers = [
    {
      firstName: 'Joe',
      lastName: 'Intern',
      email: 'intern@newskoop.com',
      password: 'Intern@123',
      role: 'INTERN'
    },
    {
      firstName: 'Jane',
      lastName: 'Journalist',
      email: 'journalist@newskoop.com',
      password: 'Journalist@123',
      role: 'JOURNALIST'
    },
    {
      firstName: 'Sam',
      lastName: 'SubEditor',
      email: 'subeditor@newskoop.com',
      password: 'SubEditor@123',
      role: 'SUB_EDITOR'
    },
    {
      firstName: 'Emma',
      lastName: 'Editor',
      email: 'editor@newskoop.com',
      password: 'Editor@123',
      role: 'EDITOR'
    },
    {
      firstName: 'Alex',
      lastName: 'Admin',
      email: 'admin@newskoop.com',
      password: 'Admin@123',
      role: 'ADMIN'
    }
  ];

  for (const staffUser of staffUsers) {
    const hashedStaffPassword = await bcrypt.hash(staffUser.password, 12);
    
    await prisma.user.upsert({
      where: { email: staffUser.email },
      update: {
        password: hashedStaffPassword,
      },
      create: {
        email: staffUser.email,
        firstName: staffUser.firstName,
        lastName: staffUser.lastName,
        password: hashedStaffPassword,
        userType: UserType.STAFF,
        staffRole: StaffRole[staffUser.role],
        isActive: true,
      },
    });
    console.log(`✅ Staff user created: ${staffUser.firstName} ${staffUser.lastName} (${staffUser.role})`);
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
        sortOrder: 0,
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
        sortOrder: 0,
      },
    });
    console.log(`✅ Religion classification created: ${classification.name}`);
  }

  // Create Locality Classifications for South African Provinces
  const localityClassifications = [
    { name: 'National', slug: 'national' },
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
        sortOrder: 0,
      },
    });
    console.log(`✅ Locality classification created: ${classification.name}`);
  }

  // Create Topical Tags (general tags for content discovery)
  const topicalTags = [
    { name: 'Politics', slug: 'politics', color: '#EF4444' },
    { name: 'Crime', slug: 'crime', color: '#F97316' },
    { name: 'Health', slug: 'health', color: '#10B981' },
    { name: 'Education', slug: 'education', color: '#3B82F6' },
    { name: 'Environment', slug: 'environment', color: '#22C55E' },
    { name: 'Technology', slug: 'technology', color: '#8B5CF6' },
    { name: 'Entertainment', slug: 'entertainment', color: '#EC4899' },
    { name: 'Business', slug: 'business', color: '#F59E0B' },
    { name: 'Transport', slug: 'transport', color: '#6366F1' },
    { name: 'Weather', slug: 'weather', color: '#0EA5E9' },
    { name: 'Human Interest', slug: 'human-interest', color: '#14B8A6' },
    { name: 'Breaking News', slug: 'breaking-news', color: '#DC2626' },
  ];

  for (const tag of topicalTags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
      },
    });
    console.log(`✅ Topical tag created: ${tag.name}`);
  }

  // Create sample stories in various stages
  const users = await prisma.user.findMany({
    where: { userType: 'STAFF' },
    select: { id: true, staffRole: true, firstName: true, lastName: true }
  });

  const journalist = users.find(u => u.staffRole === 'JOURNALIST');
  const intern = users.find(u => u.staffRole === 'INTERN');
  const subEditor = users.find(u => u.staffRole === 'SUB_EDITOR');
  const editor = users.find(u => u.staffRole === 'EDITOR');

  const sampleStories = [
    // DRAFT stories
    {
      title: 'Local Community Center Opens New Programs',
      content: 'The Johannesburg Community Center announced the launch of several new educational programs aimed at supporting local youth development...',
      status: 'DRAFT',
      authorId: journalist?.id,
      assignedToId: null,
      reviewerId: null,
    },
    {
      title: 'Small Business Growth in Eastern Cape',
      content: 'Recent statistics show a significant increase in small business registrations across the Eastern Cape province, with entrepreneurs...',
      status: 'DRAFT',
      authorId: intern?.id,
      assignedToId: subEditor?.id,
      reviewerId: null,
    },
    
    // IN_REVIEW stories (intern submissions)
    {
      title: 'Weather Alert: Heavy Rains Expected',
      content: 'The South African Weather Service has issued a warning for heavy rainfall expected across the Western Cape region this weekend...',
      status: 'IN_REVIEW',
      authorId: intern?.id,
      assignedToId: journalist?.id,
      reviewerId: journalist?.id,
    },
    
    // NEEDS_REVISION stories
    {
      title: 'Technology Summit Attracts Industry Leaders',
      content: 'The annual African Technology Summit drew hundreds of participants to Cape Town, featuring discussions on artificial intelligence...',
      status: 'NEEDS_REVISION',
      authorId: intern?.id,
      assignedToId: journalist?.id,
      reviewerId: journalist?.id,
    },
    
    // PENDING_APPROVAL stories (ready for sub-editor review)
    {
      title: 'Education Ministry Announces New Curriculum',
      content: 'The Department of Basic Education has unveiled significant changes to the national curriculum, emphasizing digital literacy...',
      status: 'PENDING_APPROVAL',
      authorId: journalist?.id,
      assignedToId: subEditor?.id,
      reviewerId: null,
    },
    {
      title: 'Local Football Team Reaches Regional Finals',
      content: 'The Soweto Stars football club has secured their place in the regional championship finals after a thrilling victory...',
      status: 'PENDING_APPROVAL',
      authorId: journalist?.id,
      assignedToId: editor?.id,
      reviewerId: null,
    },
  ];

  for (const storyData of sampleStories) {
    if (storyData.authorId) { // Only create if we have the required author
      const slug = storyData.title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      await prisma.story.create({
        data: {
          ...storyData,
          slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
          language: 'ENGLISH',
        },
      });
      console.log(`✅ Sample story created: ${storyData.title} (${storyData.status})`);
    }
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