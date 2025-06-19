import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if superadmin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'mrockhill@gmail.com' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    await prisma.user.create({
      data: {
        email: 'mrockhill@gmail.com',
        firstName: 'Matthew',
        lastName: 'Rockhill',
        password: hashedPassword,
        userType: 'STAFF',
        staffRole: 'SUPERADMIN',
        isActive: true,
      },
    });

    console.log('Created superadmin user: mrockhill@gmail.com');
  } else {
    console.log('Superadmin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 