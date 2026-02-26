import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/radio/bulletins/[id] - Get a single published bulletin
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bulletin = await prisma.bulletin.findUnique({
      where: { id },
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
                audioClips: {
                  select: {
                    id: true,
                    audioClip: {
                      select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        url: true,
                        duration: true,
                        mimeType: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!bulletin) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    // Only allow access to published bulletins for radio users
    if (session.user.userType === 'RADIO' && bulletin.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    const reverseLanguageMap: Record<string, string> = {
      'ENGLISH': 'English',
      'AFRIKAANS': 'Afrikaans',
      'XHOSA': 'Xhosa',
      'ZULU': 'Zulu',
    };

    const transformed = {
      ...bulletin,
      languageDisplay: reverseLanguageMap[bulletin.language] || bulletin.language,
      bulletinStories: (bulletin as any).bulletinStories.map((bs: any) => ({
        ...bs,
        story: {
          ...bs.story,
          audioUrl: bs.story.audioClips?.[0]?.audioClip?.url || null,
          audioClips: bs.story.audioClips?.map((sac: any) => sac.audioClip) || [],
        },
      })),
    };

    return NextResponse.json({ bulletin: transformed });
  } catch (error) {
    console.error('Error fetching radio bulletin:', error);
    return NextResponse.json({ error: 'Failed to fetch bulletin' }, { status: 500 });
  }
}
