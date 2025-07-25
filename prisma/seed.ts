import { PrismaClient, UserType, StaffRole, Province } from '@prisma/client';
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

  // Create sample categories
  const newsCategory = await prisma.category.upsert({
    where: { slug: 'news' },
    update: {},
    create: {
      name: 'News',
      slug: 'news',
      description: 'General news and current affairs',
      color: '#3B82F6',
      level: 1,
      isParent: true,
      isEditable: false,
    },
  });

  const localNewsCategory = await prisma.category.upsert({
    where: { slug: 'local-news' },
    update: {},
    create: {
      name: 'Local News',
      slug: 'local-news',
      description: 'Local community news',
      color: '#10B981',
      level: 2,
      parentId: newsCategory.id,
      isParent: false,
      isEditable: true,
    },
  });

  const internationalNewsCategory = await prisma.category.upsert({
    where: { slug: 'international-news' },
    update: {},
    create: {
      name: 'International News',
      slug: 'international-news',
      description: 'International news and world affairs',
      color: '#F59E0B',
      level: 2,
      parentId: newsCategory.id,
      isParent: false,
      isEditable: true,
    },
  });

  const sportsCategory = await prisma.category.upsert({
    where: { slug: 'sports' },
    update: {},
    create: {
      name: 'Sports',
      slug: 'sports',
      description: 'Sports news and updates',
      color: '#EF4444',
      level: 1,
      isParent: true,
      isEditable: false,
    },
  });

  const footballSportsCategory = await prisma.category.upsert({
    where: { slug: 'football' },
    update: {},
    create: {
      name: 'Football',
      slug: 'football',
      description: 'Football/Soccer news',
      color: '#8B5CF6',
      level: 2,
      parentId: sportsCategory.id,
      isParent: false,
      isEditable: true,
    },
  });

  console.log('✅ Categories created');

  // Create sample tags with new categorization
  const languageTags = [
    { name: 'English', slug: 'english', color: '#3B82F6', category: 'LANGUAGE' as const, isRequired: true, isPreset: true },
    { name: 'Afrikaans', slug: 'afrikaans', color: '#3B82F6', category: 'LANGUAGE' as const, isRequired: true, isPreset: true },
    { name: 'Xhosa', slug: 'xhosa', color: '#3B82F6', category: 'LANGUAGE' as const, isRequired: true, isPreset: true },
  ];

  const religionTags = [
    { name: 'Christian', slug: 'christian', color: '#8B5CF6', category: 'RELIGION' as const, isRequired: true, isPreset: true },
    { name: 'Muslim', slug: 'muslim', color: '#8B5CF6', category: 'RELIGION' as const, isRequired: true, isPreset: true },
    { name: 'Neutral', slug: 'neutral', color: '#8B5CF6', category: 'RELIGION' as const, isRequired: true, isPreset: true },
  ];

  const localityTags = [
    { name: 'Eastern Cape', slug: 'eastern-cape', color: '#10B981', category: 'LOCALITY' as const, isRequired: false, isPreset: true },
    { name: 'Free State', slug: 'free-state', color: '#10B981', category: 'LOCALITY' as const, isRequired: false, isPreset: true },
    { name: 'Gauteng', slug: 'gauteng', color: '#10B981', category: 'LOCALITY' as const, isRequired: false, isPreset: true },
    { name: 'KwaZulu-Natal', slug: 'kwazulu-natal', color: '#10B981', category: 'LOCALITY' as const, isRequired: false, isPreset: true },
    { name: 'Limpopo', slug: 'limpopo', color: '#10B981', category: 'LOCALITY' as const, isRequired: false, isPreset: true },
    { name: 'Mpumalanga', slug: 'mpumalanga', color: '#10B981', category: 'LOCALITY' as const, isRequired: false, isPreset: true },
    { name: 'Northern Cape', slug: 'northern-cape', color: '#10B981', category: 'LOCALITY' as const, isRequired: false, isPreset: true },
    { name: 'North West', slug: 'north-west', color: '#10B981', category: 'LOCALITY' as const, isRequired: false, isPreset: true },
    { name: 'Western Cape', slug: 'western-cape', color: '#10B981', category: 'LOCALITY' as const, isRequired: false, isPreset: true },
  ];

  const generalTags = [
    { name: 'Breaking', slug: 'breaking', color: '#6B7280', category: 'GENERAL' as const, isRequired: false, isPreset: false },
    { name: 'Politics', slug: 'politics', color: '#6B7280', category: 'GENERAL' as const, isRequired: false, isPreset: false },
    { name: 'Economy', slug: 'economy', color: '#6B7280', category: 'GENERAL' as const, isRequired: false, isPreset: false },
    { name: 'Health', slug: 'health', color: '#6B7280', category: 'GENERAL' as const, isRequired: false, isPreset: false },
    { name: 'Education', slug: 'education', color: '#6B7280', category: 'GENERAL' as const, isRequired: false, isPreset: false },
    { name: 'Technology', slug: 'technology', color: '#6B7280', category: 'GENERAL' as const, isRequired: false, isPreset: false },
    { name: 'Sports', slug: 'sports', color: '#6B7280', category: 'GENERAL' as const, isRequired: false, isPreset: false },
    { name: 'Entertainment', slug: 'entertainment', color: '#6B7280', category: 'GENERAL' as const, isRequired: false, isPreset: false },
  ];

  const allTags = [...languageTags, ...religionTags, ...localityTags, ...generalTags];

  for (const tag of allTags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {
        category: tag.category,
        isRequired: tag.isRequired,
        isPreset: tag.isPreset,
      },
      create: tag,
    });
  }

  console.log('✅ Tags created');

  // Create sample editorial staff
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
      staffRole: StaffRole.EDITOR,
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

  const subEditorPassword = await bcrypt.hash('SubEditor@123', 12);
  const subEditor = await prisma.user.upsert({
    where: { email: 'subeditor@newskoop.com' },
    update: {},
    create: {
      email: 'subeditor@newskoop.com',
      firstName: 'Lisa',
      lastName: 'SubEditor',
      password: subEditorPassword,
      userType: UserType.STAFF,
      staffRole: StaffRole.SUB_EDITOR,
      isActive: true,
    },
  });

  const internPassword = await bcrypt.hash('Intern@123', 12);
  const intern = await prisma.user.upsert({
    where: { email: 'intern@newskoop.com' },
    update: {},
    create: {
      email: 'intern@newskoop.com',
      firstName: 'Alex',
      lastName: 'Intern',
      password: internPassword,
      userType: UserType.STAFF,
      staffRole: StaffRole.INTERN,
      isActive: true,
    },
  });

  console.log('✅ Editorial staff created');

  // Create sample stories
  const sampleStories = [
    {
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

      priority: 'MEDIUM' as const,
      categoryId: localNewsCategory.id,
      authorId: journalist.id,
      status: 'PUBLISHED' as const,
      publishedAt: new Date(),
      publishedBy: editor.id,
    },
    {
      title: 'Breaking: Major Economic Policy Changes Announced',
      slug: 'breaking-major-economic-policy-changes-announced',
      content: `
# Breaking: Major Economic Policy Changes Announced

The government has announced significant changes to economic policy that will affect businesses and consumers nationwide. The new measures are designed to stimulate economic growth and address inflation concerns.

## Key Policy Changes

- Interest rate adjustments by the Reserve Bank
- New tax incentives for small businesses
- Infrastructure investment programs
- Job creation initiatives

## Expected Impact

Economists predict these changes will have both immediate and long-term effects on the economy. The business community has responded positively to the announcement.

Further details will be released in the coming days as the implementation timeline is finalized.
      `.trim(),

      priority: 'HIGH' as const,
      categoryId: localNewsCategory.id,
      authorId: journalist.id,
      status: 'PUBLISHED' as const,
      publishedAt: new Date(),
      publishedBy: editor.id,
    },
    {
      title: 'Local Football Team Wins Regional Championship',
      slug: 'local-football-team-wins-regional-championship',
      content: `
# Local Football Team Wins Regional Championship

The Johannesburg Eagles secured their first regional championship title in over a decade with a thrilling 3-2 victory against the Cape Town Sharks last night at FNB Stadium.

## Match Highlights

The game was a nail-biter from start to finish:
- Eagles took an early 2-0 lead in the first half
- Sharks fought back to tie 2-2 in the second half
- Winning goal scored in the 89th minute by striker Michael Ndlovu

## Team Celebration

Captain Sarah Mthembu lifted the trophy amid cheers from thousands of supporters. "This victory belongs to our entire community," she said during the post-match interview.

The team will now advance to the national championships next month.
      `.trim(),

      priority: 'MEDIUM' as const,
      categoryId: footballSportsCategory.id,
      authorId: journalist.id,
      status: 'PUBLISHED' as const,
      publishedAt: new Date(),
      publishedBy: editor.id,
    },
    {
      title: 'New Health Initiative Launched in Schools',
      slug: 'new-health-initiative-launched-in-schools',
      content: `
# New Health Initiative Launched in Schools

The Department of Education has launched a comprehensive health initiative targeting primary and secondary schools across the province. The program aims to improve student health outcomes and promote healthy lifestyle choices.

## Program Components

- Daily nutrition programs
- Physical activity requirements
- Mental health support services
- Health education curriculum updates

## Implementation Timeline

The program will be rolled out in phases:
1. Pilot schools - January 2024
2. Urban schools - March 2024
3. Rural schools - June 2024

Health officials expect to see measurable improvements in student wellbeing within the first year of implementation.
      `.trim(),

      priority: 'MEDIUM' as const,
      categoryId: localNewsCategory.id,
      authorId: journalist.id,
      status: 'DRAFT' as const,
    },
    {
      title: 'Intern Story: Local Library Hosts Reading Program',
      slug: 'intern-story-local-library-hosts-reading-program',
      content: `
# Local Library Hosts Reading Program

The Johannesburg Public Library has launched a new reading program aimed at encouraging young people to develop a love for books and reading.

## Program Details

The program includes:
- Weekly story time sessions for children
- Book clubs for teenagers
- Reading challenges with prizes
- Author meet-and-greet events

## Community Response

Local parents have shown great enthusiasm for the program. "It's wonderful to see our children excited about reading again," said Maria Santos, a mother of two.

The library expects to reach over 200 young readers through this initiative.
      `.trim(),
      priority: 'MEDIUM' as const,
      categoryId: localNewsCategory.id,
      authorId: intern.id,
      status: 'NEEDS_REVISION' as const,
    },
    {
      title: 'Draft: School Art Exhibition Opens Next Week',
      slug: 'draft-school-art-exhibition-opens-next-week',
      content: `
# School Art Exhibition Opens Next Week

Students from five local high schools will showcase their artwork in an exhibition opening next week at the Community Arts Center.

## Featured Artwork

The exhibition will include:
- Paintings and drawings
- Sculptures and pottery
- Photography displays
- Digital art presentations

## Opening Event

The opening ceremony is scheduled for next Friday at 6 PM. The public is invited to attend and support local young artists.

Awards will be given for outstanding pieces in each category.
      `.trim(),
      priority: 'MEDIUM' as const,
      categoryId: localNewsCategory.id,
      authorId: intern.id,
      status: 'DRAFT' as const,
    },
  ];

  // Get the tags for stories
  const breakingTag = await prisma.tag.findUnique({ where: { slug: 'breaking' } });
  const politicsTag = await prisma.tag.findUnique({ where: { slug: 'politics' } });
  const healthTag = await prisma.tag.findUnique({ where: { slug: 'health' } });

  for (const storyData of sampleStories) {
    const story = await prisma.story.upsert({
      where: { slug: storyData.slug },
      update: {},
      create: storyData,
    });

    // Add tags to specific stories
    if (storyData.slug === 'breaking-major-economic-policy-changes-announced' && breakingTag && politicsTag) {
      await prisma.storyTag.upsert({
        where: { storyId_tagId: { storyId: story.id, tagId: breakingTag.id } },
        update: {},
        create: { storyId: story.id, tagId: breakingTag.id },
      });
      await prisma.storyTag.upsert({
        where: { storyId_tagId: { storyId: story.id, tagId: politicsTag.id } },
        update: {},
        create: { storyId: story.id, tagId: politicsTag.id },
      });
    }

    if (storyData.slug === 'new-health-initiative-launched-in-schools' && healthTag) {
      await prisma.storyTag.upsert({
        where: { storyId_tagId: { storyId: story.id, tagId: healthTag.id } },
        update: {},
        create: { storyId: story.id, tagId: healthTag.id },
      });
    }
  }

  console.log('✅ Sample stories created');

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