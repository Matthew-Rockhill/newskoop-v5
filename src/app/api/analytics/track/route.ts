import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { trackContentView } from '@/lib/analytics';
import { ContentType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/analytics/track
 * Track content view events from client-side
 *
 * Body: {
 *   contentType: 'STORY' | 'BULLETIN' | 'SHOW' | 'EPISODE',
 *   contentId: string,
 *   language?: string,
 *   category?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Parse request body
    const body = await req.json();
    const { contentType, contentId, language, category } = body;

    // Validate required fields
    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'Missing contentType or contentId' },
        { status: 400 }
      );
    }

    // Validate contentType
    if (!['STORY', 'BULLETIN', 'SHOW', 'EPISODE'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid contentType' },
        { status: 400 }
      );
    }

    // Get user/station info if available
    let userId = session?.user?.id;
    let stationId: string | undefined = undefined;

    if (session?.user?.userType === 'RADIO') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { radioStationId: true },
      });
      stationId = user?.radioStationId || undefined;
    }

    // Get IP address (respecting proxies)
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      null;

    // Track the view
    await trackContentView({
      contentType: contentType as ContentType,
      contentId,
      userId,
      stationId,
      language,
      category,
      ipAddress,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track view error:', error);

    // Don't expose detailed errors to client
    // Still return success to avoid blocking user experience
    return NextResponse.json(
      { success: false, error: 'Failed to track view' },
      { status: 500 }
    );
  }
}
