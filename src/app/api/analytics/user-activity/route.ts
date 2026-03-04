import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/analytics/user-activity - Get user activity by time of day
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '7'); // Default to last 7 days

    // Get the date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get user sessions/activity data
    // Since we don't have detailed activity tracking yet, we'll simulate based on user creation and last login times
    // In a real app, you'd track user sessions or page views
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        userType: true,
        createdAt: true,
        lastLoginAt: true,
        updatedAt: true,
      },
      where: {
        isActive: true,
        OR: [
          { lastLoginAt: { gte: startDate } },
          { createdAt: { gte: startDate } },
          { updatedAt: { gte: startDate } }
        ]
      }
    });

    // Create hourly activity data (0-23 hours)
    const activityData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      time: `${hour.toString().padStart(2, '0')}:00`,
      staffUsers: 0,
      radioUsers: 0,
      total: 0
    }));

    // Simulate activity distribution based on user data
    // In reality, you'd aggregate actual session/activity data
    users.forEach(user => {
      // Use different timestamps to simulate activity
      const timestamps = [
        user.lastLoginAt,
        user.createdAt,
        user.updatedAt
      ].filter(Boolean);

      timestamps.forEach(timestamp => {
        if (timestamp && timestamp >= startDate) {
          const hour = timestamp.getHours();
          const userType = user.userType === 'STAFF' ? 'staffUsers' : 'radioUsers';
          
          activityData[hour][userType] += 1;
          activityData[hour].total += 1;
        }
      });
    });

    return NextResponse.json({
      activityData,
      metadata: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        totalUsers: users.length,
        peakHour: activityData.reduce((max, current) => 
          current.total > max.total ? current : max
        ),
      }
    });
  } catch (error) {
    console.error('Error in user activity endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 