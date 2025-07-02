import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    console.log('🔍 Debug Token:', token);
    
    if (!token) {
      return Response.json({ 
        error: 'No token found',
        debug: 'User not authenticated' 
      }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        staffRole: true,
        isActive: true,
      },
    });

    console.log('🔍 Debug User:', user);

    // Also check if we have any users at all
    const userCount = await prisma.user.count();
    const staffUsers = await prisma.user.count({
      where: {
        staffRole: { not: null }
      }
    });

    return Response.json({
      tokenPresent: !!token,
      tokenSub: token?.sub,
      userFound: !!user,
      user: user || null,
      totalUsers: userCount,
      staffUsers: staffUsers,
      debug: 'Authentication debug info'
    });
  } catch (error) {
    console.error('🔍 Debug Error:', error);
    return Response.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}