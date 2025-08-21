import { PrismaClient, UserType, StaffRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting production user seeding...');

  const users = [
    {
      firstName: 'Nadine',
      lastName: 'Intern', 
      role: StaffRole.INTERN,
      email: 'nadine@newskoop.com',
      password: 'Nadine123!'
    },
    {
      firstName: 'Nadine',
      lastName: 'Journalist',
      role: StaffRole.JOURNALIST, 
      email: 'nadine@newskoop1.com',
      password: 'Nadine123!'
    },
    {
      firstName: 'Nadine',
      lastName: 'Sub Editor',
      role: StaffRole.SUB_EDITOR,
      email: 'nadine@newskoop2.com', 
      password: 'Nadine123!'
    },
    {
      firstName: 'Nadine', 
      lastName: 'Editor',
      role: StaffRole.EDITOR,
      email: 'nadine@newskoop3.com',
      password: 'Nadine123!'
    },
    {
      firstName: 'Nadine',
      lastName: 'Admin', 
      role: StaffRole.ADMIN,
      email: 'nadine@newskoop4.com',
      password: 'Nadine123!'
    }
  ];

  for (const userData of users) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          staffRole: userData.role,
          isActive: true,
        },
        create: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: hashedPassword,
          userType: UserType.STAFF,
          staffRole: userData.role,
          isActive: true,
        },
      });

      console.log(`✅ User created/updated: ${user.firstName} ${user.lastName} (${user.email}) - ${userData.role}`);
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.email}:`, error);
    }
  }

  console.log('🎉 Production user seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });