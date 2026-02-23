import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/bulletin-schedules - Get active bulletin schedules
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's station
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { radioStation: true },
    });

    let allowedLanguages = ['English', 'Afrikaans', 'Xhosa'];

    if (session.user.userType === 'RADIO') {
      if (!user?.radioStation) {
        return NextResponse.json(
          { error: 'No station associated with user' },
          { status: 400 }
        );
      }
      if (!user.radioStation.isActive || !user.radioStation.hasContentAccess) {
        return NextResponse.json(
          { error: 'Station does not have content access' },
          { status: 403 }
        );
      }
      allowedLanguages = user.radioStation.allowedLanguages;
    } else if (session.user.userType !== 'STAFF') {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 403 }
      );
    }

    // Map display language names to StoryLanguage enum values
    const languageMap: Record<string, string> = {
      'English': 'ENGLISH',
      'Afrikaans': 'AFRIKAANS',
      'Xhosa': 'XHOSA',
      'Zulu': 'ZULU',
    };

    const languageEnums = allowedLanguages.map(l => languageMap[l] || l.toUpperCase());

    const schedules = await prisma.bulletinSchedule.findMany({
      where: {
        isActive: true,
        language: { in: languageEnums as any },
      },
      select: {
        id: true,
        title: true,
        time: true,
        language: true,
        scheduleType: true,
      },
      orderBy: { time: 'asc' },
    });

    // Reverse map for display
    const reverseLanguageMap: Record<string, string> = {
      'ENGLISH': 'English',
      'AFRIKAANS': 'Afrikaans',
      'XHOSA': 'Xhosa',
      'ZULU': 'Zulu',
    };

    const transformedSchedules = schedules.map(s => ({
      ...s,
      languageDisplay: reverseLanguageMap[s.language] || s.language,
    }));

    return NextResponse.json({
      schedules: transformedSchedules,
    });
  } catch (error) {
    console.error('Error fetching bulletin schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulletin schedules' },
      { status: 500 }
    );
  }
}
