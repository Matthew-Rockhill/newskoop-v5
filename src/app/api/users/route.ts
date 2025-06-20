import { NextRequest } from 'next/server';
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
      page = 1,
      perPage = 10 
    } = userSearchSchema.parse({
      ...searchParams,
      page: searchParams.page ? Number(searchParams.page) : 1,
      perPage: searchParams.perPage ? Number(searchParams.perPage) : 10,
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

    return Response.json({
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
    const data = (req as any).validatedData;

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return Response.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate a secure temporary password
    const temporaryPassword = generatePassword();

    const user = await prisma.user.create({
      data: {
        ...data,
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
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail the request if email sending fails
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return Response.json(userWithoutPassword, { status: 201 });
  },
  [
    withErrorHandling,
    withAuth,
    withValidation(userCreateSchema),
    withAudit('user.create'),
  ]
);

export { getUsers as GET, createUser as POST }; 