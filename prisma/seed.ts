import { PrismaClient, UserType, StaffRole, Province, ContentLanguage } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'mrockhill@gmail.com' },
    update: {},
    create: {
      email: 'mrockhill@gmail.com',
      firstName: 'Michael',
      lastName: 'Rockhill',
      password: hashedPassword,
      userType: UserType.STAFF,
      staffRole: StaffRole.SUPERADMIN,
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create sample radio station with primary contact user
  const existingStation = await prisma.station.findFirst({
    where: { name: 'Test Radio Station' },
  });

  let station;
  let primaryContact;

  if (!existingStation) {
    // Use transaction to ensure station and primary contact are created together
    const result = await prisma.$transaction(async (tx) => {
      // Create the station
      const newStation = await tx.station.create({
        data: {
          name: 'Test Radio Station',
          description: 'A test radio station for development',
          province: Province.GAUTENG,
          contactEmail: 'contact@testradio.com',
          contactNumber: '+27123456789',
          isActive: true,
          hasContentAccess: true,
        },
      });

      // Create primary contact user
      const primaryContactPassword = await bcrypt.hash('Radio@123', 12);
      const newPrimaryContact = await tx.user.create({
        data: {
          email: 'manager@testradio.com',
          firstName: 'Sarah',
          lastName: 'Manager',
          password: primaryContactPassword,
          userType: UserType.RADIO,
          isPrimaryContact: true,
          radioStationId: newStation.id,
          isActive: true,
        },
      });

      return { station: newStation, primaryContact: newPrimaryContact };
    });

    station = result.station;
    primaryContact = result.primaryContact;
  } else {
    station = existingStation;
    // Check if primary contact exists, create if not
    primaryContact = await prisma.user.findFirst({
      where: {
        radioStationId: station.id,
        isPrimaryContact: true,
      },
    });

    if (!primaryContact) {
      const primaryContactPassword = await bcrypt.hash('Radio@123', 12);
      primaryContact = await prisma.user.create({
        data: {
          email: 'manager@testradio.com',
          firstName: 'Sarah',
          lastName: 'Manager',
          password: primaryContactPassword,
          userType: UserType.RADIO,
          isPrimaryContact: true,
          radioStationId: station.id,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Station created:', station.name);
  console.log('✅ Primary contact created:', primaryContact.email);

  // Create the 5 main parent categories
  const parentCategories = [
    { name: 'News Bulletins', slug: 'news-bulletins', description: 'News bulletin collections', color: '#3B82F6' },
    { name: 'News Stories', slug: 'news-stories', description: 'Individual news stories', color: '#10B981' },
    { name: 'Sports', slug: 'sports', description: 'Sports news and updates', color: '#EF4444' },
    { name: 'Finance', slug: 'finance', description: 'Financial and business news', color: '#F59E0B' },
    { name: 'Specialty', slug: 'specialty', description: 'Specialty content and features', color: '#8B5CF6' },
  ];

  const createdCategories = [];
  for (const categoryData of parentCategories) {
    const category = await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: {},
      create: {
        ...categoryData,
        level: 1,
        isParent: true,
        isEditable: false, // Parent categories are protected
      },
    });
    createdCategories.push(category);
  }

  // Create some subcategories
  const newsStoriesCategory = createdCategories.find(c => c.slug === 'news-stories');
  const sportsCategory = createdCategories.find(c => c.slug === 'sports');

  if (newsStoriesCategory) {
    await prisma.category.upsert({
      where: { slug: 'local-news' },
      update: {},
      create: {
        name: 'Local News',
        slug: 'local-news',
        description: 'Local community news',
        color: '#059669',
        level: 2,
        parentId: newsStoriesCategory.id,
        isParent: false,
        isEditable: true,
      },
    });

    await prisma.category.upsert({
      where: { slug: 'international-news' },
      update: {},
      create: {
        name: 'International News',
        slug: 'international-news',
        description: 'International news and world affairs',
        color: '#0891B2',
        level: 2,
        parentId: newsStoriesCategory.id,
        isParent: false,
        isEditable: true,
      },
    });
  }

  if (sportsCategory) {
    await prisma.category.upsert({
      where: { slug: 'football' },
      update: {},
      create: {
        name: 'Football',
        slug: 'football',
        description: 'Football/Soccer news',
        color: '#7C3AED',
        level: 2,
        parentId: sportsCategory.id,
        isParent: false,
        isEditable: true,
      },
    });
  }

  console.log('✅ Categories created');

  // Create tags in 4 categories: Language, Locality, Religion, General
  const tags = [
    // Language tags
    { name: 'English', slug: 'english', color: '#3B82F6', category: 'language' },
    { name: 'Afrikaans', slug: 'afrikaans', color: '#10B981', category: 'language' },
    { name: 'Xhosa', slug: 'xhosa', color: '#EF4444', category: 'language' },
    { name: 'Zulu', slug: 'zulu', color: '#F59E0B', category: 'language' },
    
    // Locality tags (SA Provinces)
    { name: 'Gauteng', slug: 'gauteng', color: '#8B5CF6', category: 'locality' },
    { name: 'Western Cape', slug: 'western-cape', color: '#EC4899', category: 'locality' },
    { name: 'KwaZulu-Natal', slug: 'kwazulu-natal', color: '#06B6D4', category: 'locality' },
    { name: 'Eastern Cape', slug: 'eastern-cape', color: '#84CC16', category: 'locality' },
    { name: 'Johannesburg', slug: 'johannesburg', color: '#F97316', category: 'locality' },
    { name: 'Cape Town', slug: 'cape-town', color: '#6366F1', category: 'locality' },
    { name: 'Durban', slug: 'durban', color: '#A855F7', category: 'locality' },
    
    // Religion tags
    { name: 'Christian', slug: 'christian', color: '#059669', category: 'religion' },
    { name: 'Muslim', slug: 'muslim', color: '#0891B2', category: 'religion' },
    { name: 'Neutral', slug: 'neutral', color: '#6B7280', category: 'religion' },
    
    // General tags
    { name: 'Breaking News', slug: 'breaking-news', color: '#DC2626', category: 'general' },
    { name: 'Politics', slug: 'politics', color: '#7C3AED', category: 'general' },
    { name: 'Economy', slug: 'economy', color: '#059669', category: 'general' },
    { name: 'Health', slug: 'health', color: '#0891B2', category: 'general' },
    { name: 'Education', slug: 'education', color: '#EA580C', category: 'general' },
    { name: 'Technology', slug: 'technology', color: '#4F46E5', category: 'general' },
    { name: 'Crime', slug: 'crime', color: '#DC2626', category: 'general' },
    { name: 'Weather', slug: 'weather', color: '#06B6D4', category: 'general' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
      },
    });
  }

  console.log('✅ Tags created');

  // Create editorial staff
  const editorPassword = await bcrypt.hash('Editor@123', 12);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@newskoop.com' },
    update: {},
    create: {
      email: 'editor@newskoop.com',
      firstName: 'Jane',
      lastName: 'Editor',
      password: editorPassword,
      userType: UserType.STAFF,
      staffRole: StaffRole.SUB_EDITOR,
      isActive: true,
    },
  });

  const journalistPassword = await bcrypt.hash('Journalist@123', 12);
  const journalist = await prisma.user.upsert({
    where: { email: 'journalist@newskoop.com' },
    update: {},
    create: {
      email: 'journalist@newskoop.com',
      firstName: 'John',
      lastName: 'Reporter',
      password: journalistPassword,
      userType: UserType.STAFF,
      staffRole: StaffRole.JOURNALIST,
      isActive: true,
    },
  });

  const internPassword = await bcrypt.hash('Intern@123', 12);
  const intern = await prisma.user.upsert({
    where: { email: 'intern@newskoop.com' },
    update: {},
    create: {
      email: 'intern@newskoop.com',
      firstName: 'Mary',
      lastName: 'Intern',
      password: internPassword,
      userType: UserType.STAFF,
      staffRole: StaffRole.INTERN,
      isActive: true,
    },
  });

  console.log('✅ Editorial staff created');

  // Get the local news category for stories
  const localNewsCategory = await prisma.category.findUnique({ where: { slug: 'local-news' } });

  if (localNewsCategory) {
    // Create sample story
    const story = await prisma.story.upsert({
      where: { slug: 'local-community-center-opens-its-doors' },
      update: {},
      create: {
        title: 'Local Community Center Opens Its Doors',
        slug: 'local-community-center-opens-its-doors',
        content: `
# Local Community Center Opens Its Doors

The new Johannesburg Community Center officially opened its doors today, marking a significant milestone for the local community. The facility, which has been under construction for over two years, offers a wide range of services and programs for residents of all ages.

## Facilities and Services

The community center features:
- A modern gymnasium with basketball and volleyball courts
- Computer lab with free internet access
- Meeting rooms for community organizations
- After-school programs for children
- Senior citizen activities and support services

## Community Impact

Mayor Johnson spoke at the opening ceremony, emphasizing the center's role in bringing the community together. "This facility represents our commitment to providing quality services and opportunities for all residents," she said.

The center is expected to serve over 5,000 community members annually and will provide employment opportunities for 25 local residents.
        `.trim(),
        summary: 'New Johannesburg Community Center opens with modern facilities and programs for all ages.',
        priority: 'MEDIUM',
        categoryId: localNewsCategory.id,
        authorId: intern.id,
        status: 'DRAFT',
      },
    });

         // TODO: Create task when Prisma client is regenerated
     console.log('✅ Story created, task creation skipped (will add after client regeneration)');

    // Add some tags to the story
    const englishTag = await prisma.tag.findUnique({ where: { slug: 'english' } });
    const gautengTag = await prisma.tag.findUnique({ where: { slug: 'gauteng' } });
    const neutralTag = await prisma.tag.findUnique({ where: { slug: 'neutral' } });

    if (englishTag && gautengTag && neutralTag) {
      await prisma.storyTag.createMany({
        data: [
          { storyId: story.id, tagId: englishTag.id },
          { storyId: story.id, tagId: gautengTag.id },
          { storyId: story.id, tagId: neutralTag.id },
        ],
      });
    }

    console.log('✅ Sample story and task created');
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