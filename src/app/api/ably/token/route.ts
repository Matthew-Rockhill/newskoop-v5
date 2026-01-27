import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Ably from 'ably';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ABLY_API_KEY) {
    return NextResponse.json({ error: 'Ably not configured' }, { status: 500 });
  }

  const ably = new Ably.Rest(process.env.ABLY_API_KEY);
  const { user } = session;

  // Build capabilities based on user type
  // Staff can subscribe to all newsroom channels
  const capabilityString = user.staffRole
    ? JSON.stringify({ 'newsroom:*': ['subscribe', 'presence'] })
    : JSON.stringify({});

  // Radio users don't need real-time for now

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: user.id,
    capability: capabilityString,
  });

  return NextResponse.json(tokenRequest);
}
