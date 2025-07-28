import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling, withValidation, withAudit } from '@/lib/api-handler';
import { userCreateSchema, userSearchSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { sendEmail, generateWelcomeEmail } from '@/lib/email';
import { generatePassword } from '@/lib/auth';

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
      ...(staffRole && { staffRole }),
      ...(radioStationId && { radioStationId }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(translationLanguage && { translationLanguages: { has: translationLanguage } }),
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

    // Generate a secure temporary password
    const temporaryPassword = generatePassword();

    // Extract translationLanguage and convert to array for Prisma
    const { translationLanguage, ...restData } = data;
    const translationLanguages = translationLanguage ? [translationLanguage] : [];

    const user = await prisma.user.create({
      data: {
        ...restData,
        translationLanguages,
        password: temporaryPassword,
        mustChangePassword: true,
      },
      include: {
        radioStation: true,
      },
    });

    // Send welcome email
    try {
      const { subject, html } = generateWelcomeEmail(`${user.firstName} ${user.lastName}`, temporaryPassword);
      await sendEmail({
        to: user.email,
        subject,
        html,
      });
    } catch (error: unknown) {
      console.error('Failed to send welcome email:', error instanceof Error ? error.message : 'Unknown error');
      // Don't fail the request if email sending fails
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(userCreateSchema),
    withAudit('user.create'),
  ]
);

export { getUsers as GET, createUser as POST }; 