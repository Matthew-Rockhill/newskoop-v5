import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { userCreateSchema, userSearchSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { createAndSendMagicLink } from '@/lib/magic-link';
import { generatePassword } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET /api/users - List users with filtering and pagination
const getUsers = createHandler(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams);
    
    const { 
      query, 
      userType, 
      staffRole, 
      radioStationId, 
      isActive,
      translationLanguage,
      page = 1,
      perPage = 10 
    } = userSearchSchema.parse({
      ...searchParams,
      page: searchParams.page ? Number(searchParams.page) : 1,
      perPage: searchParams.perPage ? Number(searchParams.perPage) : 10,
      isActive: searchParams.isActive ? searchParams.isActive === 'true' : undefined,
    });

    // Build where clause
    const where: Prisma.UserWhereInput = {
      ...(query && {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      }),
      ...(userType && { userType }),
      ...(staffRole && {
        staffRole: Array.isArray(staffRole)
          ? { in: staffRole }
          : staffRole
      }),
      ...(radioStationId && { radioStationId }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(translationLanguage && { translationLanguage }),
    };

    // Get total count
    const total = await prisma.user.count({ where });

    // Get paginated users
    const users = await prisma.user.findMany({
      where,
      include: {
        radioStation: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  },
  [withErrorHandling, withAuth]
);

// POST /api/users - Create a new user
const createUser = createHandler(
  async (req: NextRequest) => {
    const data = (req as NextRequest & { validatedData: z.infer<typeof userCreateSchema> }).validatedData;

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Use transaction to ensure user creation and email sending are atomic
    const result = await prisma.$transaction(async (tx) => {
      // Generate a secure temporary password
      const temporaryPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const user = await tx.user.create({
        data: {
          ...data,
          password: hashedPassword,
          mustChangePassword: true,
        },
        include: {
          radioStation: true,
        },
      });

      console.log('Created user with ID:', user.id); // Debug log

      // Send magic link email - if this fails, rollback user creation
      const emailResult = await createAndSendMagicLink({
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        isPrimary: false,
      });

      // If email failed to send, throw error to rollback transaction
      if (!emailResult.sent) {
        throw new Error(`Failed to send magic link email: ${emailResult.error}`);
      }

      return { user, emailResult };
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = result.user;

    return NextResponse.json({
      user: userWithoutPassword,
      emailSent: result.emailResult.sent,
      message: 'User created successfully and magic link email sent',
    }, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(userCreateSchema),
    withAudit('user.create'),
  ]
);

export { getUsers as GET, createUser as POST }; 