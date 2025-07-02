const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTasks() {
  try {
    console.log('🌱 Seeding tasks...');

    // Get existing users to assign tasks to
    const users = await prisma.user.findMany({
      where: { userType: 'STAFF' },
      take: 5,
    });

    if (users.length < 2) {
      console.log('❌ Need at least 2 staff users to create tasks. Please create users first.');
      return;
    }

    // Get existing stories if any
    const stories = await prisma.story.findMany({ take: 3 });

    // Sample tasks to create
    const taskSamples = [
      {
        type: 'STORY_CREATE',
        title: 'Write breaking news story about local elections',
        description: 'Cover the upcoming municipal elections with focus on key candidates and issues affecting the community.',
        priority: 'HIGH',
        status: 'PENDING',
        assignedToId: users[0].id,
        createdById: users[1].id,
        contentType: 'story',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
      },
      {
        type: 'STORY_REVIEW',
        title: 'Review sports article about local rugby match',
        description: 'Review the sports story for accuracy, fact-checking, and editorial standards.',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        assignedToId: users[1].id,
        createdById: users[0].id,
        contentType: 'story',
        contentId: stories[0]?.id,
        dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // Due in 12 hours
      },
      {
        type: 'STORY_TRANSLATE',
        title: 'Translate health article to Afrikaans',
        description: 'Translate the health awareness article from English to Afrikaans for broader community reach.',
        priority: 'MEDIUM',
        status: 'PENDING',
        assignedToId: users[0].id,
        createdById: users[1].id,
        contentType: 'story',
        contentId: stories[1]?.id,
        sourceLanguage: 'ENGLISH',
        targetLanguage: 'AFRIKAANS',
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Due in 2 days
      },
      {
        type: 'STORY_APPROVAL',
        title: 'Approve community event coverage',
        description: 'Final approval needed for the community festival coverage before publication.',
        priority: 'HIGH',
        status: 'PENDING',
        assignedToId: users[1].id,
        createdById: users[0].id,
        contentType: 'story',
        contentId: stories[2]?.id,
        dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000), // Due in 6 hours
      },
      {
        type: 'STORY_FOLLOW_UP',
        title: 'Follow up on corruption investigation',
        description: 'Check for updates on the municipal corruption story published last week.',
        priority: 'MEDIUM',
        status: 'PENDING',
        assignedToId: users[0].id,
        createdById: users[1].id,
        contentType: 'story',
        scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Scheduled for next week
      },
      {
        type: 'BULLETIN_CREATE',
        title: 'Create morning news bulletin',
        description: 'Compile and create the morning news bulletin with top stories from the past 24 hours.',
        priority: 'URGENT',
        status: 'PENDING',
        assignedToId: users[1].id,
        createdById: users[0].id,
        contentType: 'bulletin',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // Due in 2 hours
      },
      {
        type: 'STORY_REVISION_TO_JOURNALIST',
        title: 'Revise economic analysis article',
        description: 'The economic analysis needs revision for clarity and additional local context.',
        priority: 'MEDIUM',
        status: 'PENDING',
        assignedToId: users[0].id,
        createdById: users[1].id,
        contentType: 'story',
        metadata: {
          revisionNotes: 'Please add more local business perspectives and simplify economic terms for general audience.',
        },
      },
    ];

    // Create tasks
    const createdTasks = [];
    for (const taskData of taskSamples) {
      try {
        const task = await prisma.task.create({
          data: taskData,
        });
        createdTasks.push(task);
        console.log(`✅ Created task: ${task.title}`);
      } catch (error) {
        console.error(`❌ Failed to create task "${taskData.title}":`, error.message);
      }
    }

    console.log(`\n🎉 Successfully created ${createdTasks.length} tasks!`);
    console.log('\n📋 Task Summary:');
    console.log(`   • ${createdTasks.filter(t => t.priority === 'URGENT').length} Urgent tasks`);
    console.log(`   • ${createdTasks.filter(t => t.priority === 'HIGH').length} High priority tasks`);
    console.log(`   • ${createdTasks.filter(t => t.priority === 'MEDIUM').length} Medium priority tasks`);
    console.log(`   • ${createdTasks.filter(t => t.status === 'PENDING').length} Pending tasks`);
    console.log(`   • ${createdTasks.filter(t => t.status === 'IN_PROGRESS').length} In progress tasks`);

  } catch (error) {
    console.error('❌ Error seeding tasks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTasks(); 