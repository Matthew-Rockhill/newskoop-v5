import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/bulletins - Get published bulletins for radio stations
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
        return NextResponse.json({ error: 'No station associated with user' }, { status: 400 });
      }
      if (!user.radioStation.isActive || !user.radioStation.hasContentAccess) {
        return NextResponse.json({ error: 'Station does not have content access' }, { status: 403 });
      }
      allowedLanguages = user.radioStation.allowedLanguages;
    } else if (session.user.userType !== 'STAFF') {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 403 });
    }

    // Query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;
    const language = url.searchParams.get('language');
    const scheduleId = url.searchParams.get('scheduleId');

    // Map display language names to StoryLanguage enum values
    const languageMap: Record<string, string> = {
      'English': 'ENGLISH',
      'Afrikaans': 'AFRIKAANS',
      'Xhosa': 'XHOSA',
      'Zulu': 'ZULU',
    };

    // Build language filter
    let languageFilter: string[];
    if (language && allowedLanguages.includes(language)) {
      languageFilter = [languageMap[language] || language.toUpperCase()];
    } else {
      languageFilter = allowedLanguages.map(l => languageMap[l] || l.toUpperCase());
    }

    const where: any = {
      status: 'PUBLISHED' as const,
      language: { in: languageFilter as any },
    };

    // Filter by schedule if specified
    if (scheduleId) {
      where.scheduleId = scheduleId;
    }

    const [bulletins, total] = await Promise.all([
      prisma.bulletin.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          schedule: {
            select: {
              id: true,
              title: true,
              time: true,
            },
          },
          bulletinStories: {
            include: {
              story: {
                select: {
                  id: true,
                  title: true,
                  content: true,
                  audioClips: {
                    select: {
                      id: true,
                      audioClip: {
                        select: {
                          id: true,
                          url: true,
                          duration: true,
                        },
                      },
                    },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.bulletin.count({ where }),
    ]);

    // Reverse map for display
    const reverseLanguageMap: Record<string, string> = {
      'ENGLISH': 'English',
      'AFRIKAANS': 'Afrikaans',
      'XHOSA': 'Xhosa',
      'ZULU': 'Zulu',
    };

    // Transform response
    const transformed = bulletins.map((b: any) => ({
      ...b,
      languageDisplay: reverseLanguageMap[b.language] || b.language,
      storyCount: b.bulletinStories.length,
    }));

    return NextResponse.json({
      bulletins: transformed,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
      station: {
        allowedLanguages,
      },
    });
  } catch (error) {
    console.error('Error fetching radio bulletins:', error);
    return NextResponse.json({ error: 'Failed to fetch bulletins' }, { status: 500 });
  }
}
