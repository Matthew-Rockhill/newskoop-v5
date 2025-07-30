import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that don't require authentication
const publicPaths = ['/', '/login', '/password-reset', '/dashboard'];

// Paths that require specific roles
const roleBasedPaths = {
  '/admin/newsroom': [], // Block this path explicitly - it shouldn't exist
  '/admin': ['SUPERADMIN', 'ADMIN'],
  '/admin/users': ['SUPERADMIN', 'ADMIN'],
  '/admin/stations': ['SUPERADMIN', 'ADMIN'],
  '/newsroom': ['EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('🛡️ Middleware - Checking path:', pathname);
  
  // Special debugging for the problematic path
  if (pathname.includes('/admin/newsroom/stories')) {
    console.log('🚨 FOUND IT! Request to /admin/newsroom/stories detected');
    console.log('🚨 Request URL:', request.url);
    console.log('🚨 Request headers:', Object.fromEntries(request.headers.entries()));
  }

  // Allow public paths
  if (publicPaths.includes(pathname)) {
    console.log('🛡️ Middleware - Public path allowed:', pathname);
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if not authenticated
  if (!token) {
    console.log('🛡️ Middleware - No token, redirecting to login with callback:', pathname);
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // Check role-based access for admin and newsroom routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/newsroom')) {
    const userType = token.userType as string;
    const staffRole = token.staffRole as string;
    console.log('🛡️ Middleware - Protected route check:', { pathname, userType, staffRole });

    // Only staff users can access admin and newsroom routes
    if (userType !== 'STAFF') {
      console.log('🛡️ Middleware - Not STAFF user, blocking access');
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Check specific path permissions
    for (const [path, allowedRoles] of Object.entries(roleBasedPaths)) {
      if (pathname.startsWith(path)) {
        console.log('🛡️ Middleware - Checking path permission:', { path, allowedRoles, staffRole });
        if (!allowedRoles.includes(staffRole)) {
          console.log('🛡️ Middleware - Role not allowed for path, blocking access');
          return new NextResponse('Unauthorized', { status: 403 });
        } else {
          console.log('🛡️ Middleware - Role allowed for path');
          break;
        }
      }
    }
  }

  console.log('🛡️ Middleware - Request allowed, proceeding to route:', pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static files (images, logos, etc.)
     * - images folder
     * - uploads folder
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$|images/.*|uploads/.*|api).*)',
  ],
}; 