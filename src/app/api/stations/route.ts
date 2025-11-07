import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { stationSearchSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { createAndSendMagicLink } from '@/lib/magic-link';
import { generatePassword } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Authorization check - only ADMIN and SUPERADMIN can create stations
    const userRole = session.user.staffRole;
    if (!userRole || !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only admins can create stations.' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate that primary contact data is provided
    if (!data.primaryContact) {
      return NextResponse.json(
        {
          success: false,
          error: 'Primary contact information is required',
        },
        { status: 400 }
      );
    }

    // Validate required primary contact fields (no password needed anymore)
    const requiredFields = ['firstName', 'lastName', 'email'];
    const missingFields = requiredFields.filter(field => !data.primaryContact[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required primary contact fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Create the station
      const station = await tx.station.create({
        data: {
          name: data.name,
          province: data.province,
          contactEmail: data.contactEmail || null,
          contactNumber: data.contactNumber || null,
          isActive: data.hasContentAccess ?? true,
          hasContentAccess: data.hasContentAccess ?? true,
          allowedLanguages: data.allowedLanguages || ['English', 'Afrikaans', 'Xhosa'],
          allowedReligions: data.allowedReligions || ['Christian', 'Muslim', 'Neutral'],
          blockedCategories: data.blockedCategories || [],
        },
      });

      // 2) Create primary contact with temporary password
      const tempPassword = generatePassword();
      const hashedPrimaryPassword = await bcrypt.hash(tempPassword, 10);
      const primaryUser = await tx.user.create({
        data: {
          ...data.primaryContact,
          password: hashedPrimaryPassword,
          userType: 'RADIO',
          isPrimaryContact: true,
          radioStationId: station.id,
          mustChangePassword: true,
        },
      });

      // 3) Create any additional users with temporary passwords
      const additionalUsers = [];
      if (Array.isArray(data.additionalUsers) && data.additionalUsers.length) {
        for (const userData of data.additionalUsers) {
          const tempUserPassword = generatePassword();
          const hashedUserPassword = await bcrypt.hash(tempUserPassword, 10);
          const u = await tx.user.create({
            data: {
              ...userData,
              password: hashedUserPassword,
              userType: 'RADIO',
              isPrimaryContact: false,
              radioStationId: station.id,
              mustChangePassword: true,
            },
          });
          additionalUsers.push(u);
        }
      }

      // 4) Send magic link emails to all users - inside transaction
      const emailResults = [];

      // Send to primary user
      const primaryEmailResult = await createAndSendMagicLink({
        userId: primaryUser.id,
        email: primaryUser.email,
        name: `${primaryUser.firstName} ${primaryUser.lastName}`,
        isPrimary: true,
      });

      if (!primaryEmailResult.sent) {
        throw new Error(`Failed to send magic link email to primary contact ${primaryUser.email}: ${primaryEmailResult.error}`);
      }

      emailResults.push({
        email: primaryUser.email,
        sent: primaryEmailResult.sent,
        error: primaryEmailResult.error,
      });

      // Send to additional users
      for (const user of additionalUsers) {
        const emailResult = await createAndSendMagicLink({
          userId: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          isPrimary: false,
        });

        if (!emailResult.sent) {
          throw new Error(`Failed to send magic link email to ${user.email}: ${emailResult.error}`);
        }

        emailResults.push({
          email: user.email,
          sent: emailResult.sent,
          error: emailResult.error,
        });
      }

      return { station, primaryUser, additionalUsers, emailResults };
    });

    // 5) Revalidate the stations listing
    revalidatePath('/admin/stations');

    console.log(`Station created: ${result.station.name}`);
    console.log('Email results:', result.emailResults);

    return NextResponse.json({
      success: true,
      data: {
        stationId: result.station.id,
        stationName: result.station.name,
        userCount: result.additionalUsers.length + 1,
        emailResults: result.emailResults,
      },
    });
  } catch (error) {
    console.error('Error creating station:', error);

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'A station with this name already exists or an email address is already in use',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create station. Please check your input and try again.',
      },
      { status: 500 }
    );
  }
}

// GET /api/stations - List all stations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchParamsObj = Object.fromEntries(searchParams);
    
    const { 
      query, 
      province, 
      isActive,
      page = 1,
      perPage = 10 
    } = stationSearchSchema.parse({
      ...searchParamsObj,
      page: searchParamsObj.page ? Number(searchParamsObj.page) : 1,
      perPage: searchParamsObj.perPage ? Number(searchParamsObj.perPage) : 10,
      isActive: searchParamsObj.isActive ? searchParamsObj.isActive === 'true' : undefined,
    });

    // Build where clause
    const where: Prisma.StationWhereInput = {
      ...(query && {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { contactEmail: { contains: query, mode: 'insensitive' } },
        ],
      }),
      ...(province && { province }),
      ...(typeof isActive === 'boolean' && { isActive }),
    };

    // Get total count for pagination
    const total = await prisma.station.count({ where });

    // Get stations with primary contact info
    const stations = await prisma.station.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { isPrimaryContact: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { users: true }
        }
      },
    });

    return NextResponse.json({
      stations,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch stations' 
      },
      { status: 500 }
    );
  }
}