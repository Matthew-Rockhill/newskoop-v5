"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting production user seeding...');
    const users = [
        {
            firstName: 'Nadine',
            lastName: 'Intern',
            role: client_1.StaffRole.INTERN,
            email: 'nadine@newskoop.com',
            password: 'Nadine123!'
        },
        {
            firstName: 'Nadine',
            lastName: 'Journalist',
            role: client_1.StaffRole.JOURNALIST,
            email: 'nadine@newskoop1.com',
            password: 'Nadine123!'
        },
        {
            firstName: 'Nadine',
            lastName: 'Sub Editor',
            role: client_1.StaffRole.SUB_EDITOR,
            email: 'nadine@newskoop2.com',
            password: 'Nadine123!'
        },
        {
            firstName: 'Nadine',
            lastName: 'Editor',
            role: client_1.StaffRole.EDITOR,
            email: 'nadine@newskoop3.com',
            password: 'Nadine123!'
        },
        {
            firstName: 'Nadine',
            lastName: 'Admin',
            role: client_1.StaffRole.ADMIN,
            email: 'nadine@newskoop4.com',
            password: 'Nadine123!'
        }
    ];
    for (const userData of users) {
        try {
            const hashedPassword = await bcryptjs_1.default.hash(userData.password, 12);
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
                    userType: client_1.UserType.STAFF,
                    staffRole: userData.role,
                    isActive: true,
                },
            });
            console.log(`✅ User created/updated: ${user.firstName} ${user.lastName} (${user.email}) - ${userData.role}`);
        }
        catch (error) {
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
