import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { stationSearchSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
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

    // Validate required primary contact fields
    const requiredFields = ['firstName', 'lastName', 'email', 'password'];
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
        },
      });

      // 2) Hash & create primary contact
      //    - pull off `confirmPassword` & `password`
      //    - everything else is in `primaryContactData`
      const { confirmPassword, password, ...primaryContactData } = data.primaryContact;
      const hashedPrimaryPassword = await bcrypt.hash(password, 10);
      const primaryUser = await tx.user.create({
        data: {
          ...primaryContactData,
          password: hashedPrimaryPassword,
          userType: 'RADIO',
          isPrimaryContact: true,
          radioStationId: station.id,
        },
      });

      // 3) Hash & create any additional users
      const additionalUsers = [];
      if (Array.isArray(data.additionalUsers) && data.additionalUsers.length) {
        for (const userData of data.additionalUsers) {
          const { password: userPassword, ...userDataWithoutPassword } = userData;
          const hashed = await bcrypt.hash(userPassword, 10);
          const u = await tx.user.create({
            data: {
              ...userDataWithoutPassword,
              password: hashed,
              userType: 'RADIO',
              isPrimaryContact: false,
              radioStationId: station.id,
            },
          });
          additionalUsers.push(u);
        }
      }

      return { station, primaryUser, additionalUsers };
    });

    // 4) Revalidate the stations listing so your new station shows up
    revalidatePath('/admin/stations');

    console.log(`Station created: ${result.station.name}`); 
    return NextResponse.json({
      success: true,
      data: {
        stationId: result.station.id,
        stationName: result.station.name,
        userCount: result.additionalUsers.length + 1,
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