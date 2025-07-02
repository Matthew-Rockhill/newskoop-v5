import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHandler, withAuth, withErrorHandling } from '@/lib/api-handler';

// GET /api/analytics/user-activity - Get user activity by time of day
const getUserActivity = createHandler(
  async (req: NextRequest) => {
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

    // Add some realistic activity patterns for demo purposes
    // Peak hours: 8-10 AM, 1-3 PM, 6-8 PM
    const peakHours = [8, 9, 13, 14, 18, 19];
    const moderateHours = [7, 10, 11, 12, 15, 16, 17, 20];
    
    activityData.forEach((data, hour) => {
      let multiplier = 1;
      if (peakHours.includes(hour)) {
        multiplier = 2.5;
      } else if (moderateHours.includes(hour)) {
        multiplier = 1.5;
      } else if (hour >= 22 || hour <= 6) {
        multiplier = 0.3; // Low activity during night
      }

      // Apply multiplier and add some randomness
      const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
      data.staffUsers = Math.round(data.staffUsers * multiplier * randomFactor);
      data.radioUsers = Math.round(data.radioUsers * multiplier * randomFactor);
      data.total = data.staffUsers + data.radioUsers;
    });

    return Response.json({
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
  },
  [withErrorHandling, withAuth]
);

export { getUserActivity as GET }; 