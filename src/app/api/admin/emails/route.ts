import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// GET /api/admin/emails - List email logs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is admin
    if (!session?.user || (session.user.userType !== 'STAFF' || !['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole || ''))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    
    const schema = z.object({
      page: z.coerce.number().default(1),
      perPage: z.coerce.number().default(20),
      status: z.enum(['PENDING', 'SENT', 'FAILED', 'BOUNCED', 'DELIVERED']).optional(),
      type: z.enum(['WELCOME', 'PASSWORD_RESET', 'MAGIC_LINK', 'NOTIFICATION', 'SYSTEM']).optional(),
      query: z.string().optional(),
    });
    
    const params = schema.parse({
      page: searchParams.get('page') || 1,
      perPage: searchParams.get('perPage') || 20,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      query: searchParams.get('query') || undefined,
    });
    
    // Build where clause
    const where: Prisma.EmailLogWhereInput = {};
    
    if (params.status) {
      where.status = params.status;
    }
    
    if (params.type) {
      where.type = params.type;
    }
    
    if (params.query) {
      where.OR = [
        { to: { contains: params.query, mode: 'insensitive' } },
        { subject: { contains: params.query, mode: 'insensitive' } },
      ];
    }
    
    // Get total count
    const total = await prisma.emailLog.count({ where });
    
    // Get paginated emails
    const emails = await prisma.emailLog.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
    });
    
    return NextResponse.json({
      emails,
      pagination: {
        total,
        page: params.page,
        perPage: params.perPage,
        totalPages: Math.ceil(total / params.perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}